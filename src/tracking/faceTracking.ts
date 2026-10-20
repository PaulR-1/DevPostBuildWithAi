import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Classifications } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

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

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= (async () => {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: MIN_CONFIDENCE,
        minFacePresenceConfidence: MIN_CONFIDENCE,
        minTrackingConfidence: MIN_CONFIDENCE,
        outputFaceBlendshapes: true,
      });
    } catch (err) {
      landmarkerPromise = null;
      throw new TrackingUnavailableError(String(err));
    }
  })();
  return landmarkerPromise;
}

function score(shapes: Classifications, name: string): number {
  return shapes.categories.find((c) => c.categoryName === name)?.score ?? 0;
}

const toDegrees = (rad: number) => (rad * 180) / Math.PI;
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Runs face tracking on every video frame. Returns a function that stops it. */
export function trackFrames(
  video: HTMLVideoElement,
  landmarker: FaceLandmarker,
  onReading: (reading: Reading) => void,
): () => void {
  let frameId = 0;
  let lastTime = -1;

  const tick = () => {
    frameId = requestAnimationFrame(tick);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;

    const result = landmarker.detectForVideo(video, performance.now());
    const points = result.faceLandmarks?.[0];
    const shapes = result.faceBlendshapes?.[0];
    if (!points || points.length < 478 || !shapes) {
      onReading({ faceVisible: false, yaw: 0, pitch: 0 });
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
      yaw: headYaw * HEAD_WEIGHT + eyeYaw,
      pitch: headPitch * HEAD_WEIGHT + eyeUp * EYE_PITCH_RANGE,
    });
  };

  tick();
  return () => cancelAnimationFrame(frameId);
}
