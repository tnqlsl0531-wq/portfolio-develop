/*
 * 섹션마다 한 번씩 멈춰 가는 스크롤(마우스·트랙패드가 있는 컴퓨터)
 * - 휠을 굴리면 다음 멈춤 자리까지 부드럽게 이동한 뒤 멈춥니다. 휠을 세게 휭~ 돌려도 한 칸만 가고,
 *   잠깐 멈춰 서 있다가(SNAP.hold) 계속 돌리고 있으면 그다음 칸으로 갑니다. 그래서 제목 애니메이션이 늘 보입니다.
 * - 멈춤 자리: 각 섹션의 맨 위. 화면보다 많이 긴 섹션(Director’s Note 등)은 화면 높이(100vh)를 넘지 않는 같은 간격으로
 *   나눠서 중간에도 멈춥니다. 맨 끝(아래 글자 띠)까지 내려갈 수 있게 페이지 맨 아래도 멈춤 자리로 넣습니다.
 * - 키보드(↓ ↑ PageDown PageUp Space Home End)도 같은 칸으로 움직입니다. 입력칸·선택칸에서 치는 키는 건드리지 않습니다.
 * - 폰·태블릿(터치)과 동작 줄이기 설정, 창(작품 선택·아카이브)·BACKSTAGE가 열려 있을 때는 원래 스크롤 그대로입니다.
 * - 움직임은 리니어(linear) 이징: 처음부터 끝까지 가속·감속 없이 같은 속도로 흐릅니다(SNAP.ease로 바꿀 수 있음).
 *   목차(프로그램북)에서 섹션으로 이동할 때도 같은 움직임(glideTo)을 씁니다.
 */
import { useEffect } from 'react'

/* duration : 한 칸(화면 높이만큼) 이동하는 시간(ms). 리니어라 거리에 비례하고(같은 속도), min~max 안으로 맞춥니다.
   min, max : 가장 짧은·긴 이동 시간(ms). 목차에서 멀리 뛸 때도 max를 넘지 않습니다.
   ease     : 'linear'(같은 속도) 또는 'smooth'(천천히 출발·도착).
   hold     : 도착한 뒤 계속 휠을 돌리고 있어도 멈춰 있는 시간(ms). 클수록 한 칸마다 오래 멈춥니다.
   quiet    : 휠이 이만큼(ms) 잠잠했다가 다시 굴리면 바로 다음 칸으로 갑니다(새로 굴린 것으로 봄).
   tolerance: 섹션이 화면보다 이만큼(화면 높이 대비) 더 길어도 중간에 멈추지 않고 한 번에 넘어갑니다.
   merge    : 멈춤 자리끼리 이보다(px) 가까우면 하나로 합칩니다. */
const SNAP = { duration: 900, min: 450, max: 1600, ease: 'linear' as 'linear' | 'smooth', hold: 650, quiet: 200, tolerance: .25, merge: 48 }

const easeInOut = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easing = (t: number) => (SNAP.ease === 'linear' ? t : easeInOut(t))

// 지금 움직이는 중인 이동(한 번에 하나). 휠·키보드·목차가 같이 씁니다.
const glide = { raf: 0, moving: false, endedAt: -Infinity }

export function stopGlide() {
  cancelAnimationFrame(glide.raf)
  glide.raf = 0
  if (glide.moving) glide.endedAt = performance.now()
  glide.moving = false
}

/** target(문서 위에서부터 px)까지 스크롤합니다. 동작 줄이기 설정이면 바로 이동합니다. */
export function glideTo(target: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight
  const to = Math.min(max, Math.max(0, target))
  const from = window.scrollY
  const distance = to - from
  if (Math.abs(distance) < 1) return false
  stopGlide()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: to, behavior: 'instant' })
    return true
  }
  const duration = Math.min(SNAP.max, Math.max(SNAP.min, SNAP.duration * Math.abs(distance) / window.innerHeight))
  const start = performance.now()
  glide.moving = true
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    window.scrollTo({ top: from + distance * easing(t), behavior: 'instant' })
    if (t < 1) glide.raf = requestAnimationFrame(frame)
    else {
      glide.raf = 0
      glide.moving = false
      glide.endedAt = performance.now()
    }
  }
  glide.raf = requestAnimationFrame(frame)
  return true
}

function snapStops() {
  const viewport = window.innerHeight
  const max = document.documentElement.scrollHeight - viewport
  const stops: number[] = []
  const sections = document.querySelectorAll<HTMLElement>('main.portfolio > *')
  for (const section of sections) {
    const box = section.getBoundingClientRect()
    if (box.height <= 0 || getComputedStyle(section).position === 'fixed') continue
    const top = box.top + window.scrollY
    const count = Math.max(1, Math.ceil(box.height / viewport - SNAP.tolerance))
    for (let i = 0; i < count; i++) stops.push(top + (box.height / count) * i)
  }
  stops.push(max)
  const sorted = stops.map(stop => Math.round(Math.min(max, Math.max(0, stop)))).sort((a, b) => a - b)
  // 너무 가까운 자리는 합칩니다(뒤쪽을 남겨서 맨 아래까지 닿게).
  return sorted.filter((stop, index) => index === sorted.length - 1 || sorted[index + 1] - stop >= SNAP.merge)
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

const editable = (element: Element | null) =>
  !!element && (element.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]') || !!element.closest('[contenteditable="true"]'))

export function useSectionSnap(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const active = () => pointer.matches && !reduced.matches

    const state = {
      lastWheel: -Infinity,
      history: [] as { time: number; size: number }[],
    }
    const go = glideTo

    // direction: 1 = 아래, -1 = 위. 지금 자리에서 그 방향의 다음 멈춤 자리로 갑니다.
    const step = (direction: number) => {
      const stops = snapStops()
      const current = window.scrollY
      const next = direction > 0 ? stops.find(value => value > current + 2) : [...stops].reverse().find(value => value < current - 2)
      return next === undefined ? false : go(next)
    }

    const onWheel = (event: WheelEvent) => {
      if (!active() || event.ctrlKey || blocked()) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      const dy = event.deltaY * scale
      const dx = event.deltaX * scale
      if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) < 1) return
      const direction = Math.sign(dy)
      if (scrollsInside(event.target, direction)) return
      event.preventDefault()

      const now = performance.now()
      const gap = now - state.lastWheel
      state.lastWheel = now
      state.history.push({ time: now, size: Math.abs(dy) })
      while (state.history.length > 8 || (state.history.length && now - state.history[0].time > 400)) state.history.shift()
      if (glide.moving) return

      // 트랙패드 관성(점점 약해지는 휠 신호)은 새로 굴린 것으로 치지 않습니다.
      const sizes = state.history.map(item => item.size)
      const recent = sizes.slice(-3)
      const before = sizes.slice(-6, -3)
      const average = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / Math.max(1, list.length)
      const fading = before.length === 3 && average(recent) < average(before) * .85
      const fresh = gap > SNAP.quiet
      const keptGoing = now - glide.endedAt > SNAP.hold && !fading
      if (!fresh && !keptGoing) return
      state.history = []
      step(direction)
    }

    const onKey = (event: KeyboardEvent) => {
      if (!active() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || blocked()) return
      const focus = document.activeElement
      if (editable(focus)) return
      let direction = 0
      switch (event.key) {
        case 'ArrowDown': case 'PageDown': direction = 1; break
        case 'ArrowUp': case 'PageUp': direction = -1; break
        case ' ':
          // 버튼·링크 위의 Space는 누르기 동작이라 건드리지 않습니다.
          if (focus && focus.closest('button, a, [role="button"], summary')) return
          direction = event.shiftKey ? -1 : 1
          break
        case 'Home': case 'End': {
          event.preventDefault()
          const stops = snapStops()
          go(event.key === 'Home' ? stops[0] : stops[stops.length - 1])
          return
        }
        default: return
      }
      event.preventDefault()
      if (glide.moving || (event.repeat && performance.now() - glide.endedAt < SNAP.hold)) return
      step(direction)
    }

    // 스크롤 막대를 잡거나 화면을 누르면 자동 이동을 멈추고 사용자에게 맡깁니다.
    const onPointerDown = (event: PointerEvent) => {
      // 목차(프로그램북)를 누른 건 이동을 시작하는 것이라 멈추지 않습니다.
      if (glide.moving && !(event.target instanceof Element && event.target.closest('.program-book'))) stopGlide()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      stopGlide()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [enabled])
}
