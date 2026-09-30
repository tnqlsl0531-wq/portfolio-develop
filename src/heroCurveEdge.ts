/*
 * 히어로 아래 물결(피그마 346-296 / 150-1626, 1920 × 193)의 검은 물결 아래 경계선.
 * 커서 물감 효과(SplashCursor)는 이 선 아래 흰 부분부터 보이고, 그려집니다.
 * 원래 그림(src/assets/design/hero-curve.svg)의 두 곡선(검은 물결의 아래쪽 테두리)을 그대로 옮겨 계산합니다.
 *
 * 스크롤에 따라 휘는 물결(HeroCurve.tsx): 맨 위에서는 곧은 1자(FLAT_Y)이고, 스크롤할수록 원래 물결 모양으로 휩니다.
 * 휜 정도(morph: 0 = 1자, 1 = 피그마 물결)는 setHeroCurveMorph로 바꾸고, 물감 효과 경계선도 같이 따라갑니다.
 */
type Point = [number, number]

export const HERO_CURVE_VIEW = { width: 1920, height: 193 }
const VIEW = HERO_CURVE_VIEW
// 왼쪽 끝(0, 50) → 가운데(1075.67, 62.87), 가운데 → 오른쪽 끝(1920, 66.5) 두 곡선(3차 베지어)
const CURVES: [Point, Point, Point, Point][] = [
  [[0, 50], [271.5, 137.5], [783.337, 101.231], [1075.67, 62.8655]],
  [[1075.67, 62.8655], [1368, 24.5], [1616.5, 31.2799], [1920, 66.5]],
]
// 1자일 때 높이: 물결 경계선의 평균 높이(검은 부분 넓이가 물결일 때와 같음)
export const FLAT_Y = 70.46

let morph = 1
const bend = (y: number, amount = morph) => FLAT_Y + (y - FLAT_Y) * amount

/** 물결이 휜 정도를 바꿉니다(0 = 1자, 1 = 피그마 물결, 1보다 크면 조금 더 휨). 물감 효과가 경계선을 다시 재도록 알립니다. */
export function setHeroCurveMorph(amount: number) {
  if (amount === morph) return
  morph = amount
  window.dispatchEvent(new Event('hero-curve-change'))
}

/** 휜 정도(amount)에 맞춘 검은 물결 SVG 경로(1920 × 193 기준). 위쪽은 네모, 아래 테두리만 휩니다. */
export function heroCurvePath(amount: number) {
  const [[a0, a1, a2, a3], [, b1, b2, b3]] = CURVES
  const p = ([x, y]: Point) => `${x} ${bend(y, amount).toFixed(3)}`
  return `M${p(a3)}C${p(a2)} ${p(a1)} ${p(a0)}V0H${VIEW.width}V${bend(b3[1], amount).toFixed(3)}C${p(b2)} ${p(b1)} ${p(a3)}Z`
}

const bezier = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}

// 경계선 위의 점들(왼쪽 → 오른쪽). 곡선마다 32칸으로 나눠 둡니다.
const EDGE: Point[] = CURVES.flatMap(([p0, p1, p2, p3], index) =>
  Array.from({ length: 33 }, (_, step): Point => {
    const t = step / 32
    return [bezier(p0[0], p1[0], p2[0], p3[0], t), bezier(p0[1], p1[1], p2[1], p3[1], t)]
  }).slice(index === 0 ? 0 : 1),
)

/** x: 물결 그림 폭 대비 위치(0 = 왼쪽 끝, 1 = 오른쪽 끝) → 그 자리 경계선 높이(물결 그림 높이 대비 0~1) */
export function heroCurveEdge(x: number) {
  const target = Math.min(1, Math.max(0, x)) * VIEW.width
  for (let i = 1; i < EDGE.length; i++) {
    const [x1, y1] = EDGE[i]
    if (x1 < target) continue
    const [x0, y0] = EDGE[i - 1]
    const t = x1 === x0 ? 0 : (target - x0) / (x1 - x0)
    return bend(y0 + (y1 - y0) * t) / VIEW.height
  }
  return bend(EDGE[EDGE.length - 1][1]) / VIEW.height
}
