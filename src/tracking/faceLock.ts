/** Nose position and face size, in fractions of the image width, so a jump can be compared. */
export type FaceSpot = { x: number; y: number; size: number };

/** Center and side of the square, in unmirrored video coordinates. `size` is a fraction of the image width. */
export type FaceBox = { x: number; y: number; size: number };

export type Point = { x: number; y: number };

/** How far the nose may move, in face sizes, and still be the same person. */
export const FACE_JUMP = 1.25;

/** How far shoulders may sit from the locked nose, in face sizes. They sit below the face. */
export const BODY_REACH = 2.5;

/** The last face square grows by this much before a wrist or index finger counts as covering it. */
export const HAND_BOX_SCALE = 1.5;

const NOSE_TIP = 1;
const FOREHEAD = 10;
const CHIN = 152;
const CHEEK_LEFT = 234;
const CHEEK_RIGHT = 454;

/**
 * `aspect` is video height divided by video width, so a tall face and a wide face share one size.
 * The spot's y is in that same width-fraction space. The box stays in raw image coordinates for drawing.
 */
export function measureFace(points: Point[], aspect: number): { spot: FaceSpot; box: FaceBox } | null {
  const nose = points[NOSE_TIP];
  const forehead = points[FOREHEAD];
  const chin = points[CHIN];
  const left = points[CHEEK_LEFT];
  const right = points[CHEEK_RIGHT];
  if (!nose || !forehead || !chin || !left || !right || !(aspect > 0)) return null;
  const width = Math.abs(right.x - left.x);
  const height = Math.abs(chin.y - forehead.y) * aspect;
  const size = Math.max(width, height);
  if (!(size > 0)) return null;
  return {
    spot: { x: nose.x, y: nose.y * aspect, size },
    box: { x: (left.x + right.x) / 2, y: (forehead.y + chin.y) / 2, size },
  };
}

/** The face to keep scoring. Null when every face is too far from the lock to be the same person. */
export function chooseFace(faces: FaceSpot[], lock: FaceSpot | null): FaceSpot | null {
  if (faces.length === 0) return null;
  if (!lock) return faces.reduce((best, face) => (face.size > best.size ? face : best));
  const reach = lock.size * FACE_JUMP;
  let best: FaceSpot | null = null;
  let bestDist = Infinity;
  for (const face of faces) {
    const dist = Math.hypot(face.x - lock.x, face.y - lock.y);
    if (dist <= reach && dist < bestDist) {
      best = face;
      bestDist = dist;
    }
  }
  return best;
}

/** A chosen face moves the lock. A far face leaves the lock where it was. */
export function holdLock(
  lock: FaceSpot | null,
  faces: FaceSpot[],
): { lock: FaceSpot | null; chosen: FaceSpot | null } {
  const chosen = chooseFace(faces, lock);
  return { lock: chosen ?? lock, chosen };
}

/** Shoulders count only when they belong under the locked face. `mid` uses the same space as a face spot. */
export function shouldersNearLock(mid: Point, lock: FaceSpot): boolean {
  return Math.hypot(mid.x - lock.x, mid.y - lock.y) <= lock.size * BODY_REACH;
}

/**
 * A wrist or index finger over the last face square. Both positions are raw image coordinates.
 * `aspect` is frame height divided by width, so the square stays square in the same space as the shoulder check.
 */
export function handInFaceBox(hand: Point, box: FaceBox, aspect: number): boolean {
  if (!(aspect > 0) || !(box.size > 0)) return false;
  const half = (box.size * HAND_BOX_SCALE) / 2;
  const dx = hand.x - box.x;
  const dy = (hand.y - box.y) * aspect;
  return Math.abs(dx) <= half && Math.abs(dy) <= half;
}
