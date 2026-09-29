// All three rectangular faces share these dimensions. Their vertical edges
// coincide at r = width / (2 tan(pi / 3)); no independent scaling is applied.
export const FACE_WIDTH = 706.8
export const FACE_HEIGHT = 255.6
export const FACE_STEP = 120
export const PRISM_RADIUS = FACE_WIDTH / (2 * Math.tan(Math.PI / 3))
export const REST_YAW = -45

export function faceAngle(index: number) { return (index - 1) * FACE_STEP }

export function activeFace(angle: number) {
  return ((1 + Math.round((REST_YAW - angle) / FACE_STEP)) % 3 + 3) % 3
}

export function nearestFaceAngle(index: number, current: number) {
  const target = REST_YAW - faceAngle(index)
  return target + Math.round((current - target) / 360) * 360
}

export function snapAngle(angle: number) {
  return REST_YAW + Math.round((angle - REST_YAW) / FACE_STEP) * FACE_STEP
}
