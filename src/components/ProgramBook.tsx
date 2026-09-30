/*
 * 프로그램북 목차 — 화면 오른쪽 아래에 늘 떠 있는 목차입니다.
 * 마우스를 올리면 표지가 왼쪽으로 넘어가며 두 면이 펼쳐지고, 항목을 누르면 그 섹션으로 이동합니다.
 * 디자인: 피그마 392-242 (한 면 261 × 338, 테두리 1px #d4d4d4, 모서리 5px)
 *
 * 펼쳐지는 원리 — 종이 한 장의 앞뒤를 뒤집는 것과 같습니다.
 *   넘어가는 판(__flip)의 앞면 = 표지, 뒷면 = 왼쪽 면.
 *   이 판을 왼쪽 모서리를 축으로 180도 돌리면 표지가 넘어가면서 뒷면(왼쪽 면)이 제자리에 서고,
 *   표지에 가려져 있던 오른쪽 면이 드러납니다. 그래서 세 면은 크기가 같아야 합니다.
 *
 * 화면에 들어가는 크기는 ProgramBook.css의 --s 하나로 정합니다(피그마 1px을 화면 몇 px로 볼지).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
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

export default function ProgramBook() {
  const root = useRef<HTMLElement>(null)
  const cover = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // 한 번이라도 펼친 적이 있는지. 처음 화면에서 '닫히는 동작'이 보이지 않게 하려고 씁니다.
  const [everOpened, setEverOpened] = useState(false)
  const [active, setActive] = useState<string>(CHAPTERS[0].id)

  const setBook = useCallback((next: boolean) => {
    setOpen(next)
    if (next) setEverOpened(true)
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
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      cover.current?.focus()
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const go = useCallback((event: React.MouseEvent, id: string) => {
    const element = document.getElementById(id)
    if (!element) return
    event.preventDefault()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    setOpen(false)
  }, [])

  const items = (side: 0 | 1) => CHAPTERS.filter(chapter => chapter.page === side).map(chapter => {
    const spot: Record<string, number> = { '--top': chapter.top }
    if (chapter.left !== undefined) spot['--left'] = chapter.left
    else if (chapter.right !== undefined) spot['--right'] = chapter.right
    return (
      <li key={chapter.id} className="program-book__slot" style={spot as CSSProperties} data-align={chapter.right !== undefined ? 'right' : 'left'}>
        <a
          href={`#${chapter.id}`}
          className="program-book__item"
          data-big={chapter.big || undefined}
          data-current={chapter.id === active || undefined}
          aria-current={chapter.id === active ? 'true' : undefined}
          onClick={event => go(event, chapter.id)}
        >
          {chapter.label.map((line, index) => <span key={index} className="program-book__line">{line}</span>)}
        </a>
      </li>
    )
  })

  return (
    <nav
      ref={root}
      className="program-book"
      aria-label="목차"
      data-open={open || undefined}
      data-ever={everOpened || undefined}
      // 마우스에서만 올리면 펼쳐집니다. 터치는 표지를 눌러서 펼칩니다.
      onPointerEnter={event => { if (event.pointerType === 'mouse') setBook(true) }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') setBook(false) }}
    >
      <div className="program-book__book">
        {/* 넘어가는 판이 DOM에서 먼저 옵니다. 화면에서 앞에 놓이는 건 translateZ가 맡고,
            이 순서 덕분에 화면 읽기 프로그램이 01 → 05 차례대로 읽습니다. */}
        <div className="program-book__flip">
          <button
            ref={cover}
            type="button"
            className="program-book__face program-book__cover"
            aria-expanded={open}
            aria-controls="program-book-pages"
            onClick={() => setBook(!open)}
          >
            <span className="program-book__year">2026</span>
            <span className="program-book__brand">
              <span className="program-book__line">CHOI-</span>
              <span className="program-book__line">SUBIN</span>
            </span>
            <span className="program-book__brand program-book__brand--strong">
              <span className="program-book__line">PORTFOLIO</span>
            </span>
          </button>

          <div className="program-book__face program-book__page program-book__page--left" inert={!open}>
            <ol className="program-book__list">{items(0)}</ol>
          </div>
        </div>

        <div className="program-book__page program-book__page--right" id="program-book-pages" inert={!open}>
          <ol className="program-book__list" start={3}>{items(1)}</ol>
        </div>
      </div>
    </nav>
  )
}
