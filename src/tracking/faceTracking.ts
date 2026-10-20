import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { Classifications } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// How many degrees a full eye blendshape score (0 to 1) is worth.
const EYE_YAW_RANGE = 30;
const EYE_PITCH_RANGE = 25;

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
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
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
    const matrix = result.facialTransformationMatrixes?.[0];
    const shapes = result.faceBlendshapes?.[0];
    if (!matrix || !shapes) {
      onReading({ faceVisible: false, yaw: 0, pitch: 0 });
      return;
    }

    // Column-major 4x4: element (row r, col c) is data[c * 4 + r].
    const m = (r: number, c: number) => matrix.data[c * 4 + r];
    const headYaw = toDegrees(Math.asin(Math.max(-1, Math.min(1, -m(2, 0)))));
    const headPitch = toDegrees(Math.atan2(m(2, 1), m(2, 2)));

    const eyeRight =
      (score(shapes, "eyeLookInLeft") - score(shapes, "eyeLookOutLeft") +
        score(shapes, "eyeLookOutRight") - score(shapes, "eyeLookInRight")) / 2;
    const eyeUp =
      (score(shapes, "eyeLookUpLeft") + score(shapes, "eyeLookUpRight") -
        score(shapes, "eyeLookDownLeft") - score(shapes, "eyeLookDownRight")) / 2;

    onReading({
      faceVisible: true,
      yaw: headYaw + eyeRight * EYE_YAW_RANGE,
      pitch: headPitch + eyeUp * EYE_PITCH_RANGE,
    });
  };

  tick();
  return () => cancelAnimationFrame(frameId);
}
