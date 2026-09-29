import { useEffect } from 'react'
import type { RefObject } from 'react'

/* 커서 주변 원 안에서만 색을 드러내는 효과 (히어로 · BACKSTAGE 마지막 사진에서 함께 씁니다)
   - stage: 이 영역 안에서 마우스가 움직이는 동안 원이 따라다닙니다.
   - stage 안의 [data-reveal] 요소(색 레이어)마다 자기 기준의 커서 위치(--mx, --my)를 넣어줍니다.
   - stage에는 --reveal(0~1, 원이 나타난 정도)과 --reveal-r(원 크기, px)을 넣어줍니다.
     실제 원 모양(마스크)은 CSS에서 이 값들로 그립니다(App.css .hero__color-layer, Backstage.css .backstage__stage-color).
   - 원 크기 = sizeRef 요소의 높이 × radius
   - 마우스가 없는 기기(터치)에서는 아무것도 하지 않습니다(CSS에서 처음부터 원래 색으로 보여줌).
   - 스크롤해서 요소가 움직여도 원은 커서 자리에 남아 있습니다. */
export const REVEAL_FOLLOW = 0.07 // 원이 커서를 따라가는 시간(초). 작을수록 바로 붙습니다.
export const REVEAL_FADE = 0.2 // 원이 나타나고 사라지는 시간(초)

export function useColorReveal(
  stageRef: RefObject<HTMLElement | null>,
  sizeRef: RefObject<HTMLElement | null>,
  radius: number,
  active = true,
) {
  useEffect(() => {
    const stage = stageRef.current
    const sizer = sizeRef.current
    if (!active || !stage || !sizer || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const targets = [...stage.querySelectorAll<HTMLElement>('[data-reveal]')]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // x, y: 커서 위치(stage 기준) / sx, sy: 부드럽게 따라가는 원의 위치 / cx, cy: 마지막 커서 위치(화면 기준)
    const s = { x: 0, y: 0, sx: 0, sy: 0, cx: 0, cy: 0, active: 0, target: 0, raf: 0, prev: 0 }

    const apply = () => {
      stage.style.setProperty('--reveal', s.active.toFixed(3))
      stage.style.setProperty('--reveal-r', (sizer.clientHeight * radius).toFixed(1) + 'px')
      const base = stage.getBoundingClientRect()
      for (const target of targets) {
        const box = target.getBoundingClientRect()
        target.style.setProperty('--mx', (s.sx - (box.left - base.left)).toFixed(1) + 'px')
        target.style.setProperty('--my', (s.sy - (box.top - base.top)).toFixed(1) + 'px')
      }
    }
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - s.prev) / 1000))
      s.prev = now
      const follow = reduced ? 1 : 1 - Math.exp(-dt / REVEAL_FOLLOW)
      const fade = reduced ? 1 : 1 - Math.exp(-dt / REVEAL_FADE)
      s.sx += (s.x - s.sx) * follow
      s.sy += (s.y - s.sy) * follow
      s.active += (s.target - s.active) * fade
      const settled = Math.abs(s.x - s.sx) < 0.2 && Math.abs(s.y - s.sy) < 0.2 && Math.abs(s.target - s.active) < 0.002
      if (settled) {
        s.sx = s.x
        s.sy = s.y
        s.active = s.target
      }
      apply()
      s.raf = settled ? 0 : requestAnimationFrame(tick)
    }
    const start = () => {
      if (s.raf) return
      s.prev = performance.now()
      s.raf = requestAnimationFrame(tick)
    }
    const aim = () => {
      const rect = stage.getBoundingClientRect()
      s.x = s.cx - rect.left
      s.y = s.cy - rect.top
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      s.cx = event.clientX
      s.cy = event.clientY
      aim()
      // 원이 사라진 상태에서 다시 들어오면 커서 위치에서 바로 나타나게 합니다(미끄러져 오지 않게).
      if (s.active < 0.02) {
        s.sx = s.x
        s.sy = s.y
      }
      s.target = 1
      start()
    }
    const onLeave = () => {
      s.target = 0
      start()
    }
    // 스크롤로 요소가 움직이면 원이 커서 자리에 머물도록 다시 맞춥니다.
    const onScroll = () => {
      if (s.target === 0) return
      aim()
      start()
    }
    stage.addEventListener('pointermove', onMove, { passive: true })
    stage.addEventListener('pointerenter', onMove, { passive: true })
    stage.addEventListener('pointerleave', onLeave, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      if (s.raf) cancelAnimationFrame(s.raf)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerenter', onMove)
      stage.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [stageRef, sizeRef, radius, active])
}
