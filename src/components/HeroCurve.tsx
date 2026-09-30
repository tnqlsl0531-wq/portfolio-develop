/*
 * 히어로 아래 물결(피그마 346-296 / 150-1626) — 스크롤할수록 휘는 경계선
 * - 맨 위(스크롤 0)에서는 곧은 1자이고, 스크롤을 내릴수록 피그마 물결 모양으로 휩니다. 다시 올리면 펴집니다.
 * - 휘는 정도는 스크롤 위치를 바로 쓰지 않고 용수철처럼 따라가서, 멈출 때 고무줄처럼 살짝 출렁입니다(CURVE).
 * - 기본은 검정, 커서 주변 원 안에서는 히어로 배경이 끝나는 와인색(#502421, 커서 효과 색 레이어).
 * - 경계선 모양은 heroCurveEdge.ts에 있고, 커서 물감 효과(SplashCursor)도 같은 경계선을 따라갑니다.
 */
import { useEffect, useRef } from 'react'
import { HERO_CURVE_VIEW, heroCurvePath, setHeroCurveMorph } from '../heroCurveEdge'

/* reach    : 다 휘기까지 내려야 하는 스크롤 거리(히어로+물결 높이 대비). 작을수록 빨리 휩니다.
   stiffness: 스크롤을 따라가는 힘. 클수록 바로바로 따라갑니다.
   damping  : 1이면 출렁임 없이 멈추고, 작을수록 멈출 때 더 출렁입니다. */
const CURVE = { reach: .6, stiffness: 90, damping: .42 }

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export default function HeroCurve() {
  const root = useRef<HTMLDivElement>(null)
  const paths = useRef<(SVGPathElement | null)[]>([])

  useEffect(() => {
    const element = root.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const omega = Math.sqrt(CURVE.stiffness)
    const friction = 2 * CURVE.damping * omega
    const state = { m: 0, v: 0, target: 0, raf: 0, last: 0, drawn: NaN }

    const measure = () => {
      // 물결이 있는 히어로 묶음(.hero-stage)의 높이만큼 내려가는 동안 1자 → 물결
      const stage = element.parentElement
      const distance = (stage?.offsetHeight ?? window.innerHeight) * CURVE.reach
      state.target = ease(Math.min(1, Math.max(0, window.scrollY / Math.max(1, distance))))
    }

    const draw = () => {
      const amount = Number(state.m.toFixed(4))
      if (amount === state.drawn) return
      state.drawn = amount
      const d = heroCurvePath(amount)
      for (const path of paths.current) path?.setAttribute('d', d)
      setHeroCurveMorph(amount)
    }

    const frame = (now: number) => {
      state.raf = 0
      const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 30) : 1 / 60
      state.last = now
      let remaining = dt
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 240)
        const accel = CURVE.stiffness * (state.target - state.m) - friction * state.v
        state.v += accel * h
        state.m += state.v * h
        remaining -= h
      }
      if (Math.abs(state.target - state.m) < .0005 && Math.abs(state.v) < .002) {
        state.m = state.target
        state.v = 0
        state.last = 0
        draw()
        return
      }
      draw()
      state.raf = requestAnimationFrame(frame)
    }

    const update = () => {
      measure()
      if (reduced.matches) {
        state.m = state.target
        state.v = 0
        draw()
        return
      }
      if (!state.raf) state.raf = requestAnimationFrame(frame)
    }

    // 새로 고침했을 때 이미 아래에 있으면 처음부터 휜 모양으로 시작합니다.
    measure()
    state.m = state.target
    draw()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(state.raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const { width, height } = HERO_CURVE_VIEW
  const initial = heroCurvePath(0)
  return (
    <div ref={root} className="hero-curve" aria-hidden="true">
      <svg className="hero-curve__img" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
        <rect width={width} height={height} fill="#FAFAFA" />
        <path ref={element => { paths.current[0] = element }} d={initial} fill="#0F0F0F" />
      </svg>
      <div className="hero-curve__img hero-curve__color hero__color-layer" data-reveal="">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
          <path ref={element => { paths.current[1] = element }} d={initial} fill="#502421" />
        </svg>
      </div>
    </div>
  )
}
