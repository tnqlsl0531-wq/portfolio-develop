/*
 * 부드러운 스크롤(Lenis 방식, 마우스·트랙패드가 있는 컴퓨터)
 * - 휠을 굴리면 페이지가 바로 튀지 않고, 가고 싶은 자리(target)를 향해 매 프레임 남은 거리의 일정 비율(lerp)만큼씩 따라갑니다.
 *   그래서 출발은 부드럽게 따라붙고, 멈출 때는 스르륵 감속하며 멈춥니다(뚝 끊기지 않음). Lenis의 lerp 0.1과 같은 방식입니다.
 * - 휠을 연달아 굴리면 가고 싶은 자리만 계속 늘어나서 끊김 없이 이어집니다.
 * - 키보드·스크롤 막대·다른 코드로 움직인 스크롤은 건드리지 않고 그 자리에 맞춰 둡니다.
 * - 폰·태블릿(터치), 동작 줄이기 설정, 창(작품 선택·아카이브)·BACKSTAGE가 열려 있을 때는 원래 스크롤 그대로입니다.
 * - 목차(프로그램북)에서 섹션으로 갈 때도 같은 움직임(smoothScrollTo)을 씁니다.
 */
import { useEffect } from 'react'

/* lerp  : 한 프레임(1/60초)에 남은 거리의 몇 %를 따라갈지(0~1). 작을수록 더 미끄러지듯 느리게, 클수록 빠르게 멈춥니다. Lenis 기본 0.1.
   wheel : 휠 한 번에 움직이는 거리 배율(1 = 브라우저 기본). */
const SMOOTH = { lerp: .1, wheel: 1 }

const state = { target: 0, current: 0, raf: 0, last: 0, running: false, enabled: false }

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight
const clamp = (value: number) => Math.min(maxScroll(), Math.max(0, value))

function stop() {
  cancelAnimationFrame(state.raf)
  state.raf = 0
  state.last = 0
  state.running = false
}

function frame(now: number) {
  state.raf = 0
  const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 20) : 1 / 60
  state.last = now
  const follow = 1 - Math.pow(1 - SMOOTH.lerp, dt * 60)
  state.current += (state.target - state.current) * follow
  if (Math.abs(state.target - state.current) < .5) state.current = state.target
  window.scrollTo({ top: state.current, behavior: 'instant' })
  if (state.current === state.target) stop()
  else state.raf = requestAnimationFrame(frame)
}

function start() {
  state.running = true
  if (!state.raf) state.raf = requestAnimationFrame(frame)
}

/** top(문서 위에서부터 px)까지 부드럽게 스크롤합니다. 부드러운 스크롤을 안 쓰는 기기에서는 브라우저 기본 움직임을 씁니다. */
export function smoothScrollTo(top: number) {
  if (!state.enabled) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: clamp(top), behavior: reduced ? 'instant' : 'smooth' })
    return
  }
  if (!state.running) state.current = window.scrollY
  state.target = clamp(top)
  start()
}

// 다른 창·페이지가 떠 있어서 본문 스크롤을 건드리면 안 되는 때
function blocked() {
  if (document.querySelector('dialog[open]')) return true
  const hidden = (element: HTMLElement) => getComputedStyle(element).overflowY === 'hidden'
  return hidden(document.body) || hidden(document.documentElement)
}

// 휠을 굴린 곳이 스스로 스크롤되는 상자(긴 입력칸 등) 안이면 그 상자가 먼저 움직이게 둡니다.
function scrollsInside(target: EventTarget | null, direction: number) {
  let node = target instanceof Element ? target : null
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      if (direction > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0) return true
    }
    node = node.parentElement
  }
  return false
}

export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      state.enabled = pointer.matches && !reduced.matches
      if (!state.enabled) stop()
    }
    update()
    pointer.addEventListener('change', update)
    reduced.addEventListener('change', update)

    const onWheel = (event: WheelEvent) => {
      if (!state.enabled || event.ctrlKey || blocked()) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      const dy = event.deltaY * scale
      if (Math.abs(event.deltaX * scale) > Math.abs(dy) || !dy) return
      if (scrollsInside(event.target, Math.sign(dy))) return
      event.preventDefault()
      if (!state.running) state.current = state.target = window.scrollY
      state.target = clamp(state.target + dy * SMOOTH.wheel)
      start()
    }

    // 키보드·스크롤 막대처럼 다른 방법으로 스크롤하면 부드러운 이동을 멈추고 그 자리를 새 출발점으로 삼습니다.
    const onScroll = () => {
      if (state.running && Math.abs(window.scrollY - state.current) > 4) stop()
      if (!state.running) state.current = state.target = window.scrollY
    }
    const onPointerDown = (event: PointerEvent) => {
      // 목차(프로그램북)를 누른 건 이동을 시작하는 것이라 멈추지 않습니다.
      if (state.running && !(event.target instanceof Element && event.target.closest('.program-book'))) stop()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      stop()
      state.enabled = false
      pointer.removeEventListener('change', update)
      reduced.removeEventListener('change', update)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [enabled])
}
