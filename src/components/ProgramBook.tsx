/*
 * 프로그램북 목차 — 화면 오른쪽 아래에 늘 떠 있는 목차입니다.
 * 마우스를 올리면 표지가 왼쪽 모서리(책등)를 축으로 넘어가며 두 면이 펼쳐지고, 항목을 누르면 그 섹션으로 이동합니다.
 * 디자인: 피그마 392-242 (한 면 261 × 338, 테두리 1px #d4d4d4, 모서리 5px)
 *
 * 넘어가는 원리 — 진짜 종이 한 장처럼
 * 1) 한 장(표지 = 앞면, 왼쪽 면 = 뒷면)을 세로 띠 STRIPS장으로 잘라 책등부터 차례로 이어 붙였습니다.
 *    띠마다 조금씩 더 꺾을 수 있어서, 넘기는 동안 종이가 둥글게 휘었다가 내려앉을 때 다시 펴집니다.
 * 2) 넘어가는 정도는 용수철처럼 계산합니다(MOTION). 그래서 천천히 들렸다가 빨라지고, 끝에서 살짝 튀었다 눕습니다.
 *    넘기는 도중에 마우스가 나가도 그 자리에서 자연스럽게 되돌아갑니다(뚝 끊기거나 튀지 않음).
 * 3) 빨리 넘어갈수록 종이 끝이 늦게 따라와 더 휘고(lag), 기울어진 만큼 그늘이 지며, 들린 종이 그림자가 아래 면에 드리웁니다.
 * 4) 멈춰 있을 때는 잘리지 않은 진짜 면(누를 수 있는 버튼·링크)을 보여 주고, 움직이는 동안에만 띠로 된 종이를 보여 줍니다.
 *
 * 화면에 들어가는 크기는 ProgramBook.css의 --s 하나로 정합니다(피그마 1px을 화면 몇 px로 볼지).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { smoothScrollTo } from '../hooks/useSmoothScroll'
import { pinHold, pinTop } from './Pin'
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
  /** CONTACT처럼 크게 쓰는 항목 */
  big?: boolean
}
const CHAPTERS: Chapter[] = [
  { id: 'exhibition', label: ['Grand', 'Exhibition'], page: 0, left: 25, top: 66 },
  { id: 'lineup', label: ['Stage', 'Works'], page: 0, right: 46, top: 210 },
  { id: 'gallery', label: ['Artist', 'Gallery'], page: 1, left: 22, top: 42 },
  { id: 'director', label: ['Director’s', 'Note'], page: 1, right: 30, top: 149 },
  { id: 'contact', label: ['CONTACT'], page: 1, left: 58, top: 270, big: true },
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
const MOTION = {
  follow: .14,
  stiffness: 48,
  damping: .74,
  bounce: .24,
  lag: .075,
  maxBend: 52,
  curl: 9,
  shade: .34,
  reverse: .45,
  closeDelay: 160,
}

/* 스크롤할 때 책이 화면에 딱 붙어 있지 않고 살짝 늦게 따라옵니다.
   lag: 늦게 따라오는 정도(초, 0.1~0.5 사이 권장). 클수록 더 늦게 제자리로 돌아옵니다.
   max: 가장 많이 밀려나는 거리(px). */
const FOLLOW = { lag: .22, max: 48 }

type Pose = 'closed' | 'open' | 'moving'

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

  const setBook = useCallback((next: boolean) => {
    window.clearTimeout(closeTimer.current)
    const focused = document.activeElement
    if (next && focused === cover.current) focusAfter.current = 'first'
    else if (!next && focused instanceof Node && root.current?.contains(focused)) focusAfter.current = 'cover'
    else focusAfter.current = null
    goalRef.current = next ? 1 : 0
    setOpen(next)
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
      if (Math.abs(state.p - goal) < .0008 && Math.abs(state.v) < .01 && Math.abs(state.q - goal) < .0008 && Math.abs(state.bend) < .05) {
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

  // ── 스크롤할 때 살짝 늦게 따라오기 ──────────────────
  // 페이지가 움직이면 책도 페이지와 같이 조금 끌려갔다가(최대 FOLLOW.max) 제자리로 부드럽게 돌아옵니다.
  useEffect(() => {
    const element = root.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const state = { y: window.scrollY, raf: 0, last: 0 }
    const frame = (now: number) => {
      state.raf = 0
      const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 30) : 1 / 60
      state.last = now
      const target = window.scrollY
      state.y += (target - state.y) * (1 - Math.exp(-dt / FOLLOW.lag))
      const gap = state.y - target
      if (Math.abs(gap) < .2) {
        state.y = target
        state.last = 0
        element.style.transform = ''
        return
      }
      const offset = FOLLOW.max * Math.tanh(gap / FOLLOW.max)
      element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
      state.raf = requestAnimationFrame(frame)
    }
    const onScroll = () => {
      if (reduced.matches) {
        state.y = window.scrollY
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
    // 휠 스크롤과 같은 부드러운 움직임으로 이동합니다(useSmoothScroll.ts). 화면 고정(Pin) 중인 섹션은 고정이 시작되기 전 자리(묶음 맨 위)로 갑니다.
    // landAt이 있는 섹션(Artist Gallery·Director’s Note)은 제목 애니메이션이 끝난 자리로 내려줍니다.
    // (가운데·끝 맞춤 섹션은 멈추기 시작하는 자리가 묶음 맨 위보다 --pin-top만큼 아래라서 그만큼 더 내려갑니다.)
    const pin = element.closest<HTMLElement>('.pin')
    const place = pin ?? element
    const hold = pin ? pinHold(pin) : 0
    const land = pin?.dataset.land && hold > 0 ? Number(pin.dataset.land) * hold - pinTop(pin) : 0
    smoothScrollTo(place.getBoundingClientRect().top + window.scrollY + land)
    setBook(false)
  }, [setBook])

  // copy = 넘어가는 종이 띠에 그리는 그림용 복사본(누를 수 없음)
  const items = (side: 0 | 1, copy = false) => CHAPTERS.filter(chapter => chapter.page === side).map(chapter => {
    const spot: Record<string, number> = { '--top': chapter.top }
    if (chapter.left !== undefined) spot['--left'] = chapter.left
    else if (chapter.right !== undefined) spot['--right'] = chapter.right
    const lines = chapter.label.map((line, index) => <span key={index} className="program-book__line">{line}</span>)
    const current = chapter.id === active || undefined
    return (
      <li key={chapter.id} className="program-book__slot" style={spot as CSSProperties} data-align={chapter.right !== undefined ? 'right' : 'left'}>
        {copy ? (
          <span className="program-book__item" data-big={chapter.big || undefined} data-current={current}>{lines}</span>
        ) : (
          <a
            href={`#${chapter.id}`}
            className="program-book__item"
            data-big={chapter.big || undefined}
            data-current={current}
            aria-current={current ? 'true' : undefined}
            onClick={event => go(event, chapter.id)}
          >
            {lines}
          </a>
        )}
      </li>
    )
  })

  const coverArt = (
    <>
      <span className="program-book__year">2026</span>
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
