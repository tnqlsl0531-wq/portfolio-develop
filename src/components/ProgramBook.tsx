/*
 * 프로그램북 목차 — 화면 오른쪽 아래에 늘 떠 있는 목차입니다.
 * 마우스를 올리면 표지가 왼쪽 모서리(책등)를 축으로 넘어가며 두 면이 펼쳐지고, 항목을 누르면 그 섹션으로 이동합니다.
 * 디자인: 피그마 392-242 (한 면 261 × 338, 테두리 1px #d4d4d4, 모서리 5px)
 *   10/1 수정본: 표지 '2026' 옆 가는 선, 속지 글자 #262626, 아래 연분홍 띠(#fff3f2, 높이 50), Stage Works 한 줄, Contact(40, Black) 가운데,
 *   지금 보고 있는 섹션 위에 아래를 가리키는 겹꺾쇠(피그마 Vector 1813·1814) — 밑줄 대신. 꺾쇠는 펼칠 때 위에서 톡 떨어지고, 펼쳐 둔 동안 아래로 살랑살랑 흔들립니다.
 *
 * 넘어가는 원리 — 진짜 종이 한 장처럼
 * 1) 한 장(표지 = 앞면, 왼쪽 면 = 뒷면)을 세로 띠 STRIPS장으로 잘라 책등부터 차례로 이어 붙였습니다.
 *    띠마다 조금씩 더 꺾을 수 있어서, 넘기는 동안 종이가 둥글게 휘었다가 내려앉을 때 다시 펴집니다.
 * 2) 넘어가는 정도는 용수철처럼 계산합니다(MOTION). 그래서 천천히 들렸다가 빨라지고, 끝에서 살짝 튀었다 눕습니다.
 *    넘기는 도중에 마우스가 나가도 그 자리에서 자연스럽게 되돌아갑니다(뚝 끊기거나 튀지 않음).
 * 3) 빨리 넘어갈수록 종이 끝이 늦게 따라와 더 휘고(lag), 기울어진 만큼 그늘이 지며, 들린 종이 그림자가 아래 면에 드리웁니다.
 * 4) 멈춰 있을 때는 잘리지 않은 진짜 면(누를 수 있는 버튼·링크)을 보여 주고, 움직이는 동안에만 띠로 된 종이를 보여 줍니다.
 *    10/1: 펼치기 시작하면 진짜 면(투명)을 바로 펼친 자리에 옮겨 두어서, 종이가 다 내려앉기 전에도 왼쪽 면 항목에 마우스를 올리고 누를 수 있습니다
 *    (올린 항목은 움직이는 종이 그림에도 똑같이 색이 바뀌어 보입니다).
 *
 * 화면에 들어가는 크기는 ProgramBook.css의 --s 하나로 정합니다(피그마 1px을 화면 몇 px로 볼지).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { smoothScrollTo } from '../hooks/useSmoothScroll'
import { pinLandTop } from './Pin'
import './ProgramBook.css'

/* 항목 자리는 피그마 좌표 그대로입니다(한 면 261 × 338 기준).
   left가 있으면 왼쪽 맞춤, right가 있으면 오른쪽 맞춤입니다. */
type Chapter = {
  id: string
  label: string[]
  /** 0 = 왼쪽 면, 1 = 오른쪽 면 */
  page: 0 | 1
  top: number
  left?: number
  /** 오른쪽 맞춤일 때 면의 오른쪽 끝에서 떨어진 거리 */
  right?: number
  /** 면 가운데 맞춤 */
  center?: boolean
  /** Contact처럼 크게 쓰는 항목 */
  big?: boolean
}
// 피그마 392-242 수정본(10/1) 좌표. 오른쪽 맞춤은 면 안쪽 폭(259) 기준 오른쪽 끝에서 떨어진 거리입니다.
const CHAPTERS: Chapter[] = [
  { id: 'exhibition', label: ['Grand', 'Exhibition'], page: 0, left: 25, top: 66 },
  { id: 'lineup', label: ['Stage Works'], page: 0, right: 24, top: 211 },
  { id: 'gallery', label: ['Artist', 'Gallery'], page: 1, left: 22, top: 42 },
  { id: 'director', label: ['Director’s', 'Note'], page: 1, right: 28, top: 152 },
  { id: 'contact', label: ['Contact'], page: 1, center: true, top: 264, big: true },
]

// 지금 보고 있는 섹션으로 치는 기준선: 화면 높이의 35% 지점
const SPY_LINE = .35

// 종이를 자르는 세로 띠 수(많을수록 곡선이 매끄럽지만 무거워짐)
const STRIPS = 12

/* 넘기는 움직임 — 숫자만 바꿔서 느낌을 조절합니다.
   follow  : 목표를 부드럽게 따라가는 시간(초). 클수록 처음에 더 천천히 들립니다.
   stiffness: 종이가 목표로 가는 힘. 클수록 빨리 넘어갑니다.
   damping : 1이면 딱 멈추고, 1보다 작을수록 끝에서 살짝 더 넘어갔다 돌아옵니다.
   bounce  : 넘어간 종이가 바닥(반대쪽 면)에 닿을 때 튀어 오르는 정도(0 = 안 튐).
   lag     : 빨리 넘길수록 종이 끝이 늦게 따라오는 정도(초). 클수록 많이 휩니다.
   maxBend : 가장 많이 휠 때의 각도(도).
   curl    : 종이가 서 있을 때(90도 근처) 저절로 살짝 말리는 정도(도).
   shade   : 종이가 기울 때 생기는 그늘 진하기(0~1).
   reverse : 넘기는 도중 방향이 바뀔 때 남기는 속도(0~1). 작을수록 그 자리에서 바로 돌아섭니다.
   closeDelay: 마우스가 책에서 나간 뒤 닫히기 시작할 때까지(ms). 가장자리를 스칠 때 깜빡이지 않게 합니다. */
// 10/1: 펼치는 속도가 느리다는 피드백으로 약 2배 빠르게(다 펼쳐지는 데 약 0.4초, 예전 0.7초 · 완전히 멈추는 데 0.6초, 예전 1.5초).
const MOTION = {
  follow: .05,
  stiffness: 140,
  damping: .8,
  bounce: .18,
  lag: .045,
  maxBend: 46,
  curl: 9,
  shade: .34,
  reverse: .45,
  closeDelay: 160,
}
// 이만큼 가까워지면 다 넘어간 것으로 보고 진짜 면으로 바꿉니다(각도 약 0.7도 · 눈으로는 차이 없음). 작을수록 늦게 바뀝니다.
const SETTLE = { p: .004, v: .06, bend: .4 }

/* 스크롤할 때 책이 화면에 딱 붙어 있지 않고, 페이지에 살짝 끌려갔다가 '통' 하고 튕기며 제자리로 돌아옵니다(9/30 밤: 더 귀엽게).
   drag     : 스크롤한 거리 중 책이 같이 끌려가는 몫(0~1). 클수록 많이 끌려감.
   max      : 가장 많이 밀려나는 거리(px).
   stiffness: 제자리로 돌아오는 용수철 힘. 클수록 빨리 돌아옴(돌아오는 데 약 0.4~0.6초).
   damping  : 1이면 튕김 없이 멈추고, 작을수록 제자리를 지나쳤다 돌아오는 '통통' 튕김이 커짐.
   tilt     : 움직이는 빠르기에 따라 좌우로 갸우뚱하는 정도(최대 각도, 도). 아래 가운데를 축으로 흔들립니다.
   squash   : 빠르게 움직일 때 세로로 살짝 늘어나는(가로는 그만큼 좁아지는) 정도(최대 비율). */
// 10/1: '조금만 덜 촐싹거리게' — 끌려가는 몫·거리, 튕김, 갸우뚱, 늘어남을 조금씩 줄였습니다(예전 drag .32 · max 56 · damping .3 · tilt 5 · squash .06).
const FOLLOW = { drag: .25, max: 44, stiffness: 150, damping: .42, tilt: 3.2, squash: .04 }

type Pose = 'closed' | 'open' | 'moving'

/**
 * 지금 보고 있는 섹션 위에 붙는 겹꺾쇠(피그마 Vector 1813 아래 큰 꺾쇠 #707070 · 1814 위 작은 꺾쇠 #9A9A9A, 선 2).
 * 두 꺾쇠를 따로 두어 하나씩 떨어지고, 따로 흔들립니다(ProgramBook.css .program-book__here).
 */
function HereMark() {
  return (
    <span className="program-book__here" aria-hidden="true">
      <svg className="program-book__chev program-book__chev--top" viewBox="0 0 18 10" fill="none" focusable="false">
        <path d="M1 1L9.22077 9L17 1" stroke="#9A9A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="program-book__chev program-book__chev--bottom" viewBox="0 0 23 12" fill="none" focusable="false">
        <path d="M1 1L11.7898 11L22 1" stroke="#707070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export default function ProgramBook() {
  const root = useRef<HTMLElement>(null)
  const cover = useRef<HTMLButtonElement>(null)
  const leaf = useRef<HTMLDivElement>(null)
  const strips = useRef<(HTMLDivElement | null)[]>([])
  const frontShades = useRef<(HTMLElement | null)[]>([])
  const backShades = useRef<(HTMLElement | null)[]>([])
  const cast = useRef<HTMLElement>(null)
  const ground = useRef<HTMLElement>(null)
  const wakeRef = useRef<() => void>(() => {})
  const goalRef = useRef(0)
  const closeTimer = useRef(0)
  // 키보드로 펼치고 닫을 때 포커스를 옮길 곳(펼치면 첫 항목, 닫으면 표지)
  const focusAfter = useRef<'first' | 'cover' | null>(null)

  const [open, setOpen] = useState(false)
  const [pose, setPose] = useState<Pose>('closed')
  const [active, setActive] = useState<string>(CHAPTERS[0].id)
  // 마우스를 올린 항목 — 종이가 넘어가는 동안(진짜 면은 투명)에도 움직이는 종이 그림에 같은 색을 보여 주려고 기억합니다.
  const [hovered, setHovered] = useState<string | null>(null)

  const setBook = useCallback((next: boolean) => {
    window.clearTimeout(closeTimer.current)
    const focused = document.activeElement
    if (next && focused === cover.current) focusAfter.current = 'first'
    else if (!next && focused instanceof Node && root.current?.contains(focused)) focusAfter.current = 'cover'
    else focusAfter.current = null
    goalRef.current = next ? 1 : 0
    setOpen(next)
    if (!next) setHovered(null)
    wakeRef.current()
  }, [])

  // ── 넘기는 움직임(용수철 + 휘는 종이) ──────────────────
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const state = { p: 0, v: 0, q: 0, bend: 0, last: 0, raf: 0, moving: false }
    const omega = Math.sqrt(MOTION.stiffness)
    const friction = 2 * MOTION.damping * omega
    // 책등에서 멀수록 더 많이 꺾이도록 띠마다 꺾는 몫을 나눠 둡니다(합 = 1).
    const weights = Array.from({ length: STRIPS }, (_, k) => (k === 0 ? 0 : k + .5))
    const weightSum = weights.reduce((sum, w) => sum + w, 0)
    const fronts: number[] = Array.from({ length: STRIPS }, () => 0)
    const backs: number[] = Array.from({ length: STRIPS }, () => 0)

    const render = () => {
      const angle = -180 * state.p
      // 종이가 서 있을수록(90도 근처) 저절로 조금 말리고, 빨리 움직일수록 끝이 늦게 따라와 더 휩니다.
      const upright = Math.sin(Math.PI * Math.min(1, Math.max(0, state.p)))
      const total = state.bend + MOTION.curl * upright * (goalRef.current ? 1 : -1)
      let sum = angle
      for (let k = 0; k < STRIPS; k++) {
        const turn = k === 0 ? angle : total * weights[k] / weightSum
        if (k > 0) sum += turn
        const strip = strips.current[k]
        if (strip) strip.style.transform = `rotateY(${turn.toFixed(3)}deg)`
        const cos = Math.cos(sum * Math.PI / 180)
        fronts[k] = Math.min(1, (1 - cos) * MOTION.shade)
        backs[k] = Math.min(1, (1 + cos) * MOTION.shade)
      }
      // 띠마다 그늘이 계단처럼 끊겨 보이지 않게, 띠 양 끝을 옆 띠와 평균 내어 그라데이션으로 잇습니다.
      for (let k = 0; k < STRIPS; k++) {
        const prev = k > 0 ? k - 1 : k
        const next = k < STRIPS - 1 ? k + 1 : k
        const front = frontShades.current[k]
        const back = backShades.current[k]
        if (front) {
          front.style.setProperty('--a', ((fronts[prev] + fronts[k]) / 2).toFixed(3))
          front.style.setProperty('--b', ((fronts[k] + fronts[next]) / 2).toFixed(3))
        }
        // 뒷면 조각은 좌우가 뒤집혀 있어서 왼쪽이 띠의 바깥쪽(책등에서 먼 쪽)입니다.
        if (back) {
          back.style.setProperty('--a', ((backs[k] + backs[next]) / 2).toFixed(3))
          back.style.setProperty('--b', ((backs[prev] + backs[k]) / 2).toFixed(3))
        }
      }
      // 들린 종이 그림자: 오른쪽 면 위(펼치기 시작·닫히기 끝) / 왼쪽 바닥(펼치기 끝·닫히기 시작)
      const lift = Math.sin(Math.min(Math.PI, Math.max(0, state.p * Math.PI)))
      const reach = Math.cos(angle * Math.PI / 180)
      if (cast.current) {
        cast.current.style.opacity = state.p < .5 ? (lift * .55).toFixed(3) : '0'
        cast.current.style.setProperty('--reach', Math.max(0, reach).toFixed(3))
      }
      if (ground.current) {
        ground.current.style.opacity = state.p > .5 ? (lift * .4).toFixed(3) : '0'
        ground.current.style.setProperty('--reach', Math.max(0, -reach).toFixed(3))
      }
    }

    const settle = (goal: number) => {
      state.p = state.q = goal
      state.v = state.bend = 0
      state.moving = false
      state.last = 0
      render()
      if (cast.current) cast.current.style.opacity = '0'
      if (ground.current) ground.current.style.opacity = '0'
      if (leaf.current) leaf.current.style.transform = `translateZ(.5px) rotateY(${goal ? -180 : 0}deg)`
      setPose(goal ? 'open' : 'closed')
      // 다 넘어간 뒤 포커스 옮기기(표지는 펼치면 뒤로 숨어서, 그대로 두면 포커스가 사라짐)
      const move = focusAfter.current
      focusAfter.current = null
      if (move) requestAnimationFrame(() => {
        if (move === 'first') root.current?.querySelector<HTMLElement>('.program-book__leaf a')?.focus({ preventScroll: true })
        else cover.current?.focus({ preventScroll: true })
      })
    }

    const frame = (now: number) => {
      state.raf = 0
      const goal = goalRef.current
      const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 30) : 1 / 60
      state.last = now
      let remaining = dt
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 240)
        state.q += (goal - state.q) * (1 - Math.exp(-h / MOTION.follow))
        const accel = MOTION.stiffness * (state.q - state.p) - friction * state.v
        state.v += accel * h
        state.p += state.v * h
        // 반대쪽 면(바닥)에 닿으면 튀어 오릅니다.
        if (state.p > 1) { state.p = 2 - state.p; state.v = -state.v * MOTION.bounce }
        if (state.p < 0) { state.p = -state.p; state.v = -state.v * MOTION.bounce }
        const target = Math.max(-MOTION.maxBend, Math.min(MOTION.maxBend, state.v * 180 * MOTION.lag))
        state.bend += (target - state.bend) * (1 - Math.exp(-h / .05))
        remaining -= h
      }
      if (Math.abs(state.p - goal) < SETTLE.p && Math.abs(state.v) < SETTLE.v && Math.abs(state.q - goal) < SETTLE.p && Math.abs(state.bend) < SETTLE.bend) {
        settle(goal)
        return
      }
      render()
      state.raf = requestAnimationFrame(frame)
    }

    let lastGoal = 0
    wakeRef.current = () => {
      const goal = goalRef.current
      // 넘기다가 마음을 바꾸면(마우스가 금방 나가면) 손으로 잡아 세우듯 속도를 줄여, 끝까지 갔다 오지 않고 그 자리에서 되돌아갑니다.
      if (goal !== lastGoal && state.moving) state.v *= MOTION.reverse
      lastGoal = goal
      if (reduced.matches) {
        cancelAnimationFrame(state.raf)
        state.raf = 0
        settle(goal)
        return
      }
      if (!state.moving) {
        if (state.p === goal) return
        state.moving = true
        setPose('moving')
      }
      // 진짜 면(투명)은 바로 도착할 자리에 옮겨 둡니다 → 종이가 다 내려앉기 전에도 왼쪽 면 항목을 누를 수 있음(10/1).
      if (leaf.current) leaf.current.style.transform = `translateZ(.5px) rotateY(${goal ? -180 : 0}deg)`
      if (!state.raf) state.raf = requestAnimationFrame(frame)
    }

    settle(0)
    return () => cancelAnimationFrame(state.raf)
  }, [])

  // ── 지금 보고 있는 섹션 표시 ──────────────────────────
  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const line = window.innerHeight * SPY_LINE
      let current = CHAPTERS[0].id as string
      for (const chapter of CHAPTERS) {
        const element = document.getElementById(chapter.id)
        if (element && element.getBoundingClientRect().top <= line) current = chapter.id
      }
      setActive(current)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }
    check()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  // ── 펼친 동안: 바깥을 누르거나 Esc를 누르면 닫습니다(터치·키보드) ──
  useEffect(() => {
    if (!open) return
    const down = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setBook(false)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setBook(false)
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, setBook])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // ── 스크롤할 때 살짝 늦게 따라오기(통통 튀는 용수철) ──────────────────
  // 페이지가 움직이면 책도 그만큼 조금 끌려갔다가(최대 FOLLOW.max), 용수철처럼 제자리를 살짝 지나쳤다 돌아오며 멈춥니다.
  // 그동안 빠르기에 따라 좌우로 갸우뚱하고(tilt), 늘어났다 납작해집니다(squash).
  useEffect(() => {
    const element = root.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const omega = Math.sqrt(FOLLOW.stiffness)
    const friction = 2 * FOLLOW.damping * omega
    const state = { x: 0, v: 0, scroll: window.scrollY, raf: 0, last: 0 }
    const clampTo = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
    const frame = (now: number) => {
      state.raf = 0
      const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 30) : 1 / 60
      state.last = now
      // 지난 프레임 뒤로 페이지가 움직인 만큼 책도 같이 끌려갑니다(내리면 위로, 올리면 아래로).
      const scroll = window.scrollY
      state.x = clampTo(state.x - (scroll - state.scroll) * FOLLOW.drag, FOLLOW.max * 1.4)
      state.scroll = scroll
      let remaining = dt
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 240)
        state.v += (-FOLLOW.stiffness * state.x - friction * state.v) * h
        state.x += state.v * h
        remaining -= h
      }
      if (Math.abs(state.x) < .15 && Math.abs(state.v) < 2) {
        state.x = 0
        state.v = 0
        state.last = 0
        element.style.transform = ''
        return
      }
      const offset = FOLLOW.max * Math.tanh(state.x / FOLLOW.max)
      // 빠르기(px/초)를 -1~1로 줄여 갸우뚱·늘어남에 씁니다.
      const speed = Math.tanh(state.v / 900)
      const tilt = FOLLOW.tilt * speed
      const stretch = 1 + FOLLOW.squash * Math.abs(speed)
      element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg) scale(${(2 - stretch).toFixed(4)}, ${stretch.toFixed(4)})`
      state.raf = requestAnimationFrame(frame)
    }
    const onScroll = () => {
      if (reduced.matches) {
        state.scroll = window.scrollY
        return
      }
      if (!state.raf) state.raf = requestAnimationFrame(frame)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(state.raf)
      window.removeEventListener('scroll', onScroll)
      element.style.transform = ''
    }
  }, [])

  const go = useCallback((event: ReactMouseEvent, id: string) => {
    const element = document.getElementById(id)
    if (!element) return
    event.preventDefault()
    // 휠 스크롤과 같은 부드러운 움직임으로 이동합니다(useSmoothScroll.ts). 화면 고정(Pin) 중인 섹션은 화면에 멈추기 시작하는 자리로 갑니다
    // (가운데·끝 맞춤이나 focus가 있는 섹션은 묶음 맨 위보다 --pin-top만큼 아래 = Stage Works는 무대가 다 보이는 자리).
    // landAt이 있는 섹션(Artist Gallery·Director’s Note)은 제목 애니메이션이 끝난 자리로 내려줍니다.
    const pin = element.closest<HTMLElement>('.pin')
    smoothScrollTo(pin ? pinLandTop(pin) : element.getBoundingClientRect().top + window.scrollY)
    setBook(false)
  }, [setBook])

  // copy = 넘어가는 종이 띠에 그리는 그림용 복사본(누를 수 없음)
  const items = (side: 0 | 1, copy = false) => CHAPTERS.filter(chapter => chapter.page === side).map(chapter => {
    const spot: Record<string, number> = { '--top': chapter.top }
    if (chapter.left !== undefined) spot['--left'] = chapter.left
    else if (chapter.right !== undefined) spot['--right'] = chapter.right
    const align = chapter.center ? 'center' : chapter.right !== undefined ? 'right' : 'left'
    const lines = chapter.label.map((line, index) => <span key={index} className="program-book__line">{line}</span>)
    const current = chapter.id === active || undefined
    // 지금 보고 있는 섹션 표시(겹꺾쇠). 진짜 면에서는 펼칠 때마다 새로 붙여서 떨어지는 등장 애니메이션이 다시 나오고,
    // 넘어가는 종이 그림(copy)에는 움직임 없이 그려 둡니다.
    const here = current && (copy || open) ? <HereMark /> : null
    return (
      <li key={chapter.id} className="program-book__slot" style={spot as CSSProperties} data-align={align}>
        {copy ? (
          <span className="program-book__item" data-big={chapter.big || undefined} data-current={current} data-hover={hovered === chapter.id || undefined}>{here}{lines}</span>
        ) : (
          <a
            href={`#${chapter.id}`}
            className="program-book__item"
            data-big={chapter.big || undefined}
            data-current={current}
            aria-current={current ? 'true' : undefined}
            onClick={event => go(event, chapter.id)}
            onPointerEnter={() => setHovered(chapter.id)}
            onPointerLeave={() => setHovered(previous => (previous === chapter.id ? null : previous))}
          >
            {here}{lines}
          </a>
        )}
      </li>
    )
  })

  const coverArt = (
    <>
      <span className="program-book__year">2026</span>
      {/* 피그마 Vector 1815: '2026' 옆 가는 선(폭 181, #d4d4d4) */}
      <span className="program-book__rule" aria-hidden="true" />
      <span className="program-book__brand">
        <span className="program-book__line">CHOI-</span>
        <span className="program-book__line">SUBIN</span>
      </span>
      <span className="program-book__brand program-book__brand--strong">
        <span className="program-book__line">PORTFOLIO</span>
      </span>
    </>
  )

  // 넘어가는 종이: 띠 k 안에 띠 k+1이 들어 있어서, 앞 띠가 꺾이면 뒤 띠들이 그 끝에 붙어 같이 따라갑니다.
  const strip = (k: number): ReactNode => (
    <div
      className="program-book__strip"
      ref={element => { strips.current[k] = element }}
      style={{ left: k === 0 ? 0 : '100%', width: `calc(var(--page-w) / ${STRIPS})` }}
    >
      <div className="program-book__slice">
        <div className="program-book__cover program-book__copy" style={{ left: `calc(var(--page-w) * ${-k} / ${STRIPS})` }}>{coverArt}</div>
        <i className="program-book__shade" ref={element => { frontShades.current[k] = element }} />
      </div>
      <div className="program-book__slice program-book__slice--back">
        <div className="program-book__page program-book__page--left program-book__copy" style={{ left: `calc(var(--page-w) * ${-(STRIPS - 1 - k)} / ${STRIPS} + 1px)` }}>
          <ol className="program-book__list">{items(0, true)}</ol>
        </div>
        <i className="program-book__shade" ref={element => { backShades.current[k] = element }} />
      </div>
      {k + 1 < STRIPS && strip(k + 1)}
    </div>
  )

  return (
    <nav
      ref={root}
      className="program-book"
      aria-label="목차"
      // 이 위에서는 커서 효과(물감 등)가 나오지 않습니다(SplashCursor가 이 표시를 봅니다).
      data-cursor-quiet=""
      data-open={open || undefined}
      data-pose={pose}
      // 마우스에서만 올리면 펼쳐집니다. 터치는 표지를 눌러서 펼칩니다.
      onPointerEnter={event => { if (event.pointerType === 'mouse') setBook(true) }}
      onPointerLeave={event => {
        if (event.pointerType !== 'mouse') return
        window.clearTimeout(closeTimer.current)
        closeTimer.current = window.setTimeout(() => setBook(false), MOTION.closeDelay)
      }}
    >
      <div className="program-book__book">
        {/* 펼치는 동안 왼쪽 빈자리도 책의 일부로 쳐서, 마우스를 옮기다 닫히지 않게 합니다. */}
        <div className="program-book__hit" aria-hidden="true" />
        <i className="program-book__ground" ref={ground} aria-hidden="true" />

        {/* 넘어가는 장(멈춰 있을 때 쓰는 진짜 면). DOM에서 먼저 와서 화면 읽기 프로그램이 01 → 05 차례대로 읽습니다. */}
        <div className="program-book__leaf" ref={leaf}>
          <button
            ref={cover}
            type="button"
            className="program-book__face program-book__cover"
            aria-expanded={open}
            aria-controls="program-book-pages"
            onClick={() => setBook(!open)}
          >
            {coverArt}
          </button>
          <div className="program-book__face program-book__page program-book__page--left" inert={!open}>
            <ol className="program-book__list">{items(0)}</ol>
          </div>
        </div>

        <div className="program-book__page program-book__page--right" id="program-book-pages" inert={!open}>
          <ol className="program-book__list" start={3}>{items(1)}</ol>
          <i className="program-book__cast" ref={cast} aria-hidden="true" />
        </div>

        {/* 움직이는 동안에만 보이는 휘는 종이(그림용) */}
        <div className="program-book__paper" aria-hidden="true">{strip(0)}</div>
      </div>
    </nav>
  )
}
