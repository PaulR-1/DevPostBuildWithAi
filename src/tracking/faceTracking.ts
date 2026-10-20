import { FaceLandmarker, FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Classifications } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Pose landmark numbers (from MediaPipe's pose map).
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const MIN_SHOULDER_VISIBILITY = 0.5;
const FRAME_INTERVAL_MS = 33;

// How many degrees the iris moving from the centre to the corner of the eye is worth.
const EYE_YAW_GAIN = 170;
// How many degrees a full eye up/down blendshape score (0 to 1) is worth.
const EYE_PITCH_RANGE = 35;
// How much head turn counts compared with eye movement.
const HEAD_WEIGHT = 0.6;
// Degrees per unit of the nose moving between the eye line and the chin.
const HEAD_PITCH_GAIN = 150;
// Lower values keep the face tracked when it is tilted down or partly covered.
const MIN_CONFIDENCE = 0.3;

// Face mesh landmark numbers (from MediaPipe's face mesh map).
const NOSE_TIP = 1;
const CHIN = 152;
const CHEEK_IMAGE_LEFT = 234;
const CHEEK_IMAGE_RIGHT = 454;
const RIGHT_EYE = { left: 33, right: 133, iris: 468 };
const LEFT_EYE = { left: 362, right: 263, iris: 473 };

export type Reading = {
  faceVisible: boolean;
  /** Shoulders in view. Only checked when the face is missing; true whenever the face is visible. */
  bodyVisible: boolean;
  /** Left/right gaze in degrees: head turn plus eye movement. */
  yaw: number;
  /** Up/down gaze in degrees: head tilt plus eye movement. */
  pitch: number;
};

export class CameraBlockedError extends Error {}
export class TrackingUnavailableError extends Error {}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
      audio: false,
    });
  } catch (err) {
    throw new CameraBlockedError(String(err));
  }
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export type Trackers = { face: FaceLandmarker; pose: PoseLandmarker };

let trackersPromise: Promise<Trackers> | null = null;

export function loadTrackers(): Promise<Trackers> {
  trackersPromise ??= (async () => {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const [face, pose] = await Promise.all([
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: MIN_CONFIDENCE,
          minFacePresenceConfidence: MIN_CONFIDENCE,
          minTrackingConfidence: MIN_CONFIDENCE,
          outputFaceBlendshapes: true,
        }),
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
      ]);
      return { face, pose };
    } catch (err) {
      trackersPromise = null;
      throw new TrackingUnavailableError(String(err));
    }
  })();
  return trackersPromise;
}

function bodyVisible(pose: PoseLandmarker, video: HTMLVideoElement): boolean {
  const body = pose.detectForVideo(video, performance.now()).landmarks?.[0];
  if (!body) return false;
  return [LEFT_SHOULDER, RIGHT_SHOULDER].some((i) => (body[i]?.visibility ?? 0) >= MIN_SHOULDER_VISIBILITY);
}

function score(shapes: Classifications, name: string): number {
  return shapes.categories.find((c) => c.categoryName === name)?.score ?? 0;
}

const toDegrees = (rad: number) => (rad * 180) / Math.PI;
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Runs face tracking on every video frame. Returns a function that stops it. */
export function trackFrames(
  video: HTMLVideoElement,
  trackers: Trackers,
  onReading: (reading: Reading) => void,
): () => void {
  let timerId = 0;
  let lastTime = -1;

  // A timer, not animation frames: Chrome nearly stops animation frames when the
  // window is covered or the tab is hidden, and tracking must keep running then.
  const tick = () => {
    timerId = window.setTimeout(tick, FRAME_INTERVAL_MS);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;

    const result = trackers.face.detectForVideo(video, performance.now());
    const points = result.faceLandmarks?.[0];
    const shapes = result.faceBlendshapes?.[0];
    if (!points || points.length < 478 || !shapes) {
      onReading({ faceVisible: false, bodyVisible: bodyVisible(trackers.pose, video), yaw: 0, pitch: 0 });
      return;
    }

    // Left/right is measured in the camera image, so head and eyes share one direction:
    // turning the head one way while the eyes look back the other way cancels out.
    const faceLeft = points[CHEEK_IMAGE_LEFT].x;
    const faceWidth = points[CHEEK_IMAGE_RIGHT].x - faceLeft || 1;
    const noseOffset = (points[NOSE_TIP].x - faceLeft) / faceWidth - 0.5;
    const headYaw = toDegrees(Math.asin(clamp(noseOffset * 2)));

    const irisOffset = (eye: typeof LEFT_EYE) => {
      const left = points[eye.left].x;
      const width = points[eye.right].x - left || 1;
      return (points[eye.iris].x - left) / width - 0.5;
    };
    const eyeYaw = ((irisOffset(RIGHT_EYE) + irisOffset(LEFT_EYE)) / 2) * EYE_YAW_GAIN;

    // Up/down: tilting the head down pushes the nose tip toward the chin in the image.
    const eyeLineY = (points[RIGHT_EYE.left].y + points[LEFT_EYE.right].y) / 2;
    const faceHeight = points[CHIN].y - eyeLineY || 1;
    const noseDrop = (points[NOSE_TIP].y - eyeLineY) / faceHeight;
    const headPitch = -noseDrop * HEAD_PITCH_GAIN;
    const eyeUp =
      (score(shapes, "eyeLookUpLeft") + score(shapes, "eyeLookUpRight") -
        score(shapes, "eyeLookDownLeft") - score(shapes, "eyeLookDownRight")) / 2;

    onReading({
      faceVisible: true,
      bodyVisible: true,
      yaw: headYaw * HEAD_WEIGHT + eyeYaw,
      pitch: headPitch * HEAD_WEIGHT + eyeUp * EYE_PITCH_RANGE,
    });
  };

  tick();
  return () => clearTimeout(timerId);
}
