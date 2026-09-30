/*
 * 목록에서 마우스와 가까운 항목이 진해지고 옆으로 밀려나는 효과 (React Bits Line Sidebar)
 * 원본: https://reactbits.dev/components/line-sidebar
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/LineSidebar
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 사용자가 준 React Bits 설정 그대로
 *   proximityRadius 75 · showMarker false(항목 옆 선 없음, 그래서 markerLength 85는 쓰이지 않습니다)
 *   나머지는 원본 기본값 falloff smooth · smoothing 100ms
 *
 * 원본에서 바꾼 점
 * - 컴포넌트가 아니라 훅으로 만들었습니다. 원본 컴포넌트는 글자 목록을 자기 방식대로 새로 그리기 때문에,
 *   그대로 쓰면 이미 만들어 둔 '오늘의 공연 순서'의 점·번호·상태·현재 작품 표시가 사라집니다.
 *   그래서 움직임 계산만 가져와 기존 목록에 씌웠고, 색은 우리가 쓰던 값을 그대로 씁니다.
 * - 항목마다 --effect(0~1) 값을 넣어 줍니다. 색·이동은 CSS에서 이 값으로 계산합니다.
 * - 원본은 세로 목록만 다룹니다. 폰·태블릿에서는 목록이 가로로 눕기 때문에 긴 쪽 방향으로 거리를 잽니다.
 * - 목록이 화면 비율에 맞춰 줄어 있어도 디자인할 때와 같은 거리로 반응하도록, 줄어든 배율만큼 반경을 보정합니다.
 * - 동작 줄이기 설정에서는 효과를 끕니다(원본은 켭니다).
 */
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

// 가까울수록 1, 반경 밖이면 0. 원본의 smooth 곡선입니다.
const falloff = (ratio: number) => ratio * ratio * (3 - 2 * ratio)

export function useLineProximity<T extends HTMLElement>(radius = 75, smoothing = 100) {
  const ref = useRef<T>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const list = ref.current
    if (!list || reducedMotion) return

    const items = () => Array.from(list.children) as HTMLElement[]
    const targets: number[] = []
    const current: number[] = []
    let frame: number | null = null
    let last = 0

    // 모든 항목의 --effect를 목표값으로 조금씩 당깁니다. 화면 주사율이 달라도 같은 속도로 움직입니다.
    const step = (now: number) => {
      const elapsed = Math.min((now - last) / 1000, .05)
      last = now
      const ratio = 1 - Math.exp(-elapsed / (Math.max(smoothing, 1) / 1000))
      let moving = false
      items().forEach((item, index) => {
        const target = targets[index] || 0
        const next = (current[index] || 0) + (target - (current[index] || 0)) * ratio
        const settled = Math.abs(target - next) < .0015
        current[index] = settled ? target : next
        item.style.setProperty('--effect', current[index].toFixed(4))
        if (!settled) moving = true
      })
      frame = moving ? requestAnimationFrame(step) : null
    }

    const start = () => {
      if (frame != null) cancelAnimationFrame(frame)
      last = performance.now()
      frame = requestAnimationFrame(step)
    }

    const move = (event: PointerEvent) => {
      const box = list.getBoundingClientRect()
      // 목록이 화면 배율에 맞춰 줄어 있으면 반경도 같은 비율로 줄입니다.
      const scale = list.offsetWidth ? box.width / list.offsetWidth : 1
      const reach = Math.max(radius * scale, 1)
      const centers = items().map(item => {
        const itemBox = item.getBoundingClientRect()
        return { x: itemBox.left + itemBox.width / 2, y: itemBox.top + itemBox.height / 2 }
      })
      // 목록이 세로로 서 있는지 가로로 누웠는지는 첫 항목과 끝 항목이 어느 쪽으로 더 벌어졌는지로 봅니다.
      // (목록 상자의 가로·세로 크기로 재면, 글자가 길어 가로로 넓은 세로 목록을 가로로 잘못 봅니다.)
      const span = centers.length > 1 ? centers[centers.length - 1] : null
      const horizontal = span ? Math.abs(span.x - centers[0].x) > Math.abs(span.y - centers[0].y) : false
      centers.forEach((center, index) => {
        const distance = horizontal ? Math.abs(event.clientX - center.x) : Math.abs(event.clientY - center.y)
        targets[index] = falloff(Math.max(0, 1 - distance / reach))
      })
      start()
    }

    const leave = () => {
      targets.fill(0)
      start()
    }

    list.addEventListener('pointermove', move)
    list.addEventListener('pointerleave', leave)
    list.addEventListener('pointercancel', leave)

    return () => {
      list.removeEventListener('pointermove', move)
      list.removeEventListener('pointerleave', leave)
      list.removeEventListener('pointercancel', leave)
      if (frame != null) cancelAnimationFrame(frame)
      items().forEach(item => item.style.removeProperty('--effect'))
    }
  }, [radius, smoothing, reducedMotion])

  return ref
}
