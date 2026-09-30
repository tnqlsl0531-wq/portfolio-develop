/*
 * 부드러운 스크롤(Lenis 방식, 마우스·트랙패드가 있는 컴퓨터)
 * - 휠을 굴리면 페이지가 바로 튀지 않고, 가고 싶은 자리(target)를 향해 매 프레임 남은 거리의 일정 비율(lerp)만큼씩 따라갑니다.
 *   그래서 출발은 부드럽게 따라붙고, 멈출 때는 스르륵 감속하며 멈춥니다(뚝 끊기지 않음). Lenis의 lerp 0.1과 같은 방식입니다.
 * - 휠을 연달아 굴리면 가고 싶은 자리만 계속 늘어나서 끊김 없이 이어집니다.
 * - 키보드·스크롤 막대·다른 코드로 움직인 스크롤은 건드리지 않고 그 자리에 맞춰 둡니다.
 * - 폰·태블릿(터치), 동작 줄이기 설정, 창(작품 선택·아카이브)·BACKSTAGE가 열려 있을 때는 원래 스크롤 그대로입니다.
 * - 목차(프로그램북)에서 섹션으로 갈 때도 같은 움직임(smoothScrollTo)을 씁니다.
 * - 꼭 멈추는 자리(10/1): <Pin stop>이 붙은 섹션(Director’s Note)은 휠을 세게 굴려 빠르게 내려가도 그 섹션에 내려앉는 자리(pinLandTop)에서 멈춥니다.
 *   같은 손짓(휠이 STOP.gap보다 짧게 쉬며 이어지는 동안)은 그 자리에 붙잡아 두고, 잠깐 쉬었다가 다시 굴리면 지나갑니다. 위로 올라갈 때는 멈추지 않습니다.
 */
import { useEffect } from 'react'
import { pinLandTop } from '../components/Pin'

/* lerp  : 한 프레임(1/60초)에 남은 거리의 몇 %를 따라갈지(0~1). 작을수록 더 미끄러지듯 느리게, 클수록 빠르게 멈춥니다. Lenis 기본 0.1.
   wheel : 휠 한 번에 움직이는 거리 배율(1 = 브라우저 기본). */
const SMOOTH = { lerp: .1, wheel: 1 }

const state = { target: 0, current: 0, raf: 0, last: 0, running: false, enabled: false }

/* gap: 휠이 이만큼(ms) 쉬었다가 다시 굴리면 새 손짓으로 봅니다(멈춘 자리를 지나갈 수 있음). 트랙패드 관성 스크롤은 쉬지 않고 이어져서 같은 손짓으로 봅니다. */
const STOP = { gap: 240 }
const gesture = { last: 0, held: false }

// from(지금 가려던 자리)과 to(새로 가려는 자리) 사이에 있는 첫 '꼭 멈추는 자리'(없으면 null)
function stopBetween(from: number, to: number) {
  let found: number | null = null
  document.querySelectorAll<HTMLElement>('.pin[data-stop]').forEach(pin => {
    const at = pinLandTop(pin)
    if (from < at - 1 && to > at && (found === null || at < found)) found = at
  })
  return found
}

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
      let next = clamp(state.target + dy * SMOOTH.wheel)
      // 꼭 멈추는 자리: 내려가다가 그 자리를 넘으려 하면 그 자리에서 멈추고, 같은 손짓이 이어지는 동안은 붙잡아 둡니다.
      const now = performance.now()
      if (now - gesture.last > STOP.gap) gesture.held = false
      gesture.last = now
      if (dy < 0) gesture.held = false
      else if (gesture.held) next = state.target
      else {
        const stop = stopBetween(state.target, next)
        if (stop !== null) {
          next = stop
          gesture.held = true
        }
      }
      state.target = next
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
