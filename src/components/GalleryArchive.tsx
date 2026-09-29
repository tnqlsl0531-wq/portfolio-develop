import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent } from 'react'
import { archiveRows } from '../archivePhotos'
import type { ArchivePhoto } from '../archivePhotos'
import spotlight from '../assets/design/gallery-spotlight.svg'
import './GalleryArchive.css'

/* Artist Gallery 아카이브 화면 (피그마 109-8 → 사진을 채운 334-2) + 사진 크게 보기 (피그마 96-192)
   - 'Artist Gallery 자세히 보러가기'를 누르면 버튼 자리에서 원이 커지며 화면을 채웁니다(피그마 메모 94:1160).
   - 윗줄은 왼쪽, 아랫줄은 오른쪽으로 천천히 흐릅니다(마퀴). 사진 목록은 src/archivePhotos.ts에 있습니다.
   - 줄을 마우스(폰은 손가락)로 잡고 옆으로 끌 수 있습니다. 세게 밀고 놓으면 그 힘으로 조금 더 미끄러지다가
     원래 방향·속도로 돌아옵니다. 끌지 않고 살짝 누르기만 하면 지금처럼 사진이 크게 열립니다.
   - 사진은 평소에 채도를 살짝 낮춰(회색빛이 돌지 않을 만큼) 보여주고, 마우스를 올리면 그 줄만 멈추고
     사진이 살짝(4%) 커지며 원래 색으로 돌아옵니다.
   - 사진을 누르면 뒤 화면이 흐려지고(6px) 어두워지며(#171717 58%) 가운데에 자르지 않은 원본 사진이 크게 뜹니다.
   - Esc, 뒤 배경 클릭으로 닫습니다. 아카이브 화면은 왼쪽 위 '돌아가기' 버튼으로도 닫습니다. */

export type ArchiveOrigin = { x: number; y: number }

const GAP = 34 // 사진 사이 간격
const SPEED = 40 // 흐르는 속도(1920 화면 기준 1초에 40px). 숫자가 작을수록 느려집니다.

// start: 처음 열었을 때 한 벌 길이 중 어디쯤에서 시작할지(두 줄이 같은 모양으로 시작하지 않게)
const rows = [
  { direction: 'left', photos: archiveRows.top, start: 0.3 },
  { direction: 'right', photos: archiveRows.bottom, start: 0.4 },
] as const

// 끌기 설정
const DRAG = {
  threshold: 6, // 이만큼(px) 움직여야 '끌기'로 봅니다. 그보다 적게 움직이면 사진 누르기(크게 보기)입니다.
  maxFling: 2000, // 놓을 때 미끄러지는 최대 속도(px/초)
  settle: 0.6, // 놓은 뒤 원래 속도로 돌아오는 데 걸리는 시간 느낌(초). 클수록 오래 미끄러집니다.
  hoverStop: 0.25, // 사진에 마우스를 올렸을 때 멈추는 시간 느낌(초)
}

// 한 벌 길이 안으로 되돌려(-loop < x ≤ 0) 두 벌을 이어 붙인 줄이 끊김 없이 이어지게 합니다.
const wrapOffset = (x: number, loop: number) => {
  const r = x % loop
  return r > 0 ? r - loop : r
}

type RowMotion = {
  offset: number // 지금 옆으로 움직인 거리(px)
  velocity: number // 지금 속도(px/초)
  loop: number // 한 벌 길이(px)
  base: number // 원래 흐르는 속도(px/초, 왼쪽은 -)
  hover: boolean
  focus: boolean
  drag: null | { id: number; startX: number; startOffset: number; lastX: number; lastT: number; v: number; active: boolean }
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function GalleryArchive({ origin, onClose }: { origin: ArchiveOrigin | null; onClose: () => void }) {
  const archive = useRef<HTMLDialogElement>(null)
  const viewer = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)
  const [selected, setSelected] = useState<ArchivePhoto | null>(null)
  const isOpen = origin !== null

  // 아카이브 화면 열고 닫기 + 뒤 페이지 스크롤 잠금
  useEffect(() => {
    const element = archive.current
    if (!element) return
    if (isOpen && !element.open) element.showModal()
    else if (!isOpen && element.open) element.close()
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isOpen])

  // 사진 크게 보기 열고 닫기
  useEffect(() => {
    const element = viewer.current
    if (!element) return
    if (selected && !element.open) element.showModal()
    else if (!selected && element.open) element.close()
  }, [selected])

  // ── 사진 줄 흐르기 + 끌기 ─────────────────────────────
  // 줄마다 위치·속도를 기억해 두고 매 프레임 옮깁니다(CSS 애니메이션 대신 — 손으로 끌어야 해서).
  const trackElements = useRef<(HTMLDivElement | null)[]>([])
  const motions = useRef<RowMotion[]>(rows.map(() => ({ offset: 0, velocity: 0, loop: 0, base: 0, hover: false, focus: false, drag: null })))
  const suppressClick = useRef(false)
  const pausedAll = useRef(false)
  useEffect(() => { pausedAll.current = selected !== null || closing }, [selected, closing])

  // 한 벌 길이를 재고 속도를 맞춥니다(창 크기가 바뀌면 다시 재고, 보던 위치는 비율대로 유지).
  const measureRows = () => {
    rows.forEach((row, index) => {
      const track = trackElements.current[index]
      const motion = motions.current[index]
      if (!track) return
      const loop = track.scrollWidth / 2
      if (!loop) return
      // 한 벌 길이(사진 폭 + 간격)를 SPEED로 나눈 시간에 한 벌을 지나가게 합니다(사진 수가 바뀌어도 같은 속도).
      const loopUnits = row.photos.reduce((sum, photo) => sum + photo.width + GAP, 0)
      const first = !motion.loop
      motion.offset = first ? -row.start * loop : (motion.offset / motion.loop) * loop
      motion.loop = loop
      motion.base = (loop * SPEED / loopUnits) * (row.direction === 'left' ? -1 : 1)
      // 처음 열 때는 바로 원래 속도로 흐릅니다(움직임 줄이기 설정이면 멈춘 채).
      if (first && !prefersReducedMotion()) motion.velocity = motion.base
      track.style.transform = `translate3d(${motion.offset}px, 0, 0)`
    })
  }

  useEffect(() => {
    if (!isOpen) return
    // 창이 열린 뒤(위의 showModal 다음)에 재야 크기가 나옵니다.
    measureRows()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let last = 0
    const step = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      rows.forEach((_, index) => {
        const motion = motions.current[index]
        const track = trackElements.current[index]
        if (!track || !motion.loop) return
        if (!motion.drag?.active) {
          // 멈춰야 할 때(사진에 마우스·키보드 초점, 크게 보는 중, 움직임 줄이기)는 0으로, 아니면 원래 속도로 부드럽게 맞춥니다.
          const stop = pausedAll.current || motion.hover || motion.focus || reduced.matches
          const target = stop ? 0 : motion.base
          const ease = stop ? DRAG.hoverStop : DRAG.settle
          motion.velocity += (target - motion.velocity) * (1 - Math.exp(-dt / ease))
          motion.offset += motion.velocity * dt
        }
        motion.offset = wrapOffset(motion.offset, motion.loop)
        track.style.transform = `translate3d(${motion.offset}px, 0, 0)`
      })
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    window.addEventListener('resize', measureRows)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measureRows)
    }
    // measureRows는 ref만 쓰므로 다시 만들 필요가 없습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const rowHandlers = (index: number) => {
    const motion = () => motions.current[index]
    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
      const drag = motion().drag
      if (!drag || drag.id !== event.pointerId) return
      if (drag.active) {
        // 마지막으로 움직인 지 0.1초 넘게 가만히 있다가 놓았으면 미끄러지지 않습니다.
        const recent = event.timeStamp - drag.lastT < 100
        motion().velocity = recent ? Math.max(-DRAG.maxFling, Math.min(DRAG.maxFling, drag.v)) : 0
        suppressClick.current = true
        delete event.currentTarget.dataset.dragging
        // 놓은 자리가 사진 위면(마우스) 그 줄은 다시 멈춥니다.
        const under = document.elementFromPoint(event.clientX, event.clientY)
        motion().hover = event.pointerType === 'mouse' && under !== null && event.currentTarget.contains(under) && under.closest('.archive__photo') !== null
      }
      motion().drag = null
    }
    return {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        suppressClick.current = false
        motion().drag = { id: event.pointerId, startX: event.clientX, startOffset: motion().offset, lastX: event.clientX, lastT: event.timeStamp, v: 0, active: false }
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        const drag = motion().drag
        if (!drag || drag.id !== event.pointerId) return
        if (!drag.active) {
          if (Math.abs(event.clientX - drag.startX) < DRAG.threshold) return
          // 여기서부터 끌기: 이 줄이 손가락·마우스를 계속 따라오게 잡아 둡니다.
          drag.active = true
          drag.startX = event.clientX
          drag.startOffset = motion().offset
          drag.lastX = event.clientX
          drag.lastT = event.timeStamp
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.dataset.dragging = 'true'
          return
        }
        motion().offset = drag.startOffset + (event.clientX - drag.startX)
        const seconds = (event.timeStamp - drag.lastT) / 1000
        if (seconds > 0) drag.v = drag.v * 0.2 + ((event.clientX - drag.lastX) / seconds) * 0.8
        drag.lastX = event.clientX
        drag.lastT = event.timeStamp
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      // 끌고 난 뒤 손을 뗄 때 생기는 '클릭'으로 사진이 열리지 않게 막습니다.
      onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
        if (!suppressClick.current) return
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
      },
      // 사진 위에 마우스가 있거나 키보드로 사진을 고르면 그 줄만 멈춥니다.
      onPointerOver: (event: PointerEvent<HTMLDivElement>) => {
        motion().hover = event.pointerType === 'mouse' && (event.target as Element).closest('.archive__photo') !== null
      },
      onPointerLeave: () => { motion().hover = false },
      onFocus: (event: FocusEvent<HTMLDivElement>) => { motion().focus = event.target.matches(':focus-visible') },
      onBlur: () => { motion().focus = false },
    }
  }

  // 닫을 때는 원이 다시 버튼 자리로 작아진 뒤 닫힙니다(움직임 줄이기 설정이면 바로 닫힘).
  const requestClose = () => {
    if (prefersReducedMotion()) archive.current?.close()
    else setClosing(true)
  }

  // 흰 카드 바깥(흐린 배경)을 누르면 닫힘
  const closeViewerOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
    if (!inside) setSelected(null)
  }

  const style = origin ? ({ '--origin-x': `${origin.x}px`, '--origin-y': `${origin.y}px` } as CSSProperties) : undefined

  return (
    <dialog
      ref={archive}
      className="archive"
      aria-labelledby="archive-title"
      style={style}
      data-closing={closing}
      data-viewing={selected !== null}
      // React는 안쪽 사진 창의 cancel/close 이벤트도 바깥으로 전달하므로, 아카이브 자신의 이벤트일 때만 처리합니다.
      onCancel={event => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        requestClose()
      }}
      onClose={event => {
        if (event.target !== event.currentTarget) return
        setClosing(false)
        setSelected(null)
        onClose()
      }}
      onAnimationEnd={event => { if (event.target === event.currentTarget && closing) archive.current?.close() }}
    >
      {/* 돌아가기: '자세히 보러가기'와 같은 선+꺾인 끝 화살표(피그마 217-1556)를 좌우로 뒤집어 왼쪽을 가리키게 했습니다.
          선 길이는 글자 폭 + 50(원본과 같은 비율), 마우스를 올리면 선이 29만큼 왼쪽으로 길어지고 꺾인 끝이 따라갑니다. */}
      <button className="archive__back" onClick={requestClose} autoFocus>
        <span className="archive__back-label">돌아가기</span>
        <svg className="archive__back-arrow" viewBox="0 0 161 23" fill="none" aria-hidden="true" focusable="false">
          <line className="archive__back-line" x1="1" y1="22" x2="160" y2="22" />
          <path className="archive__back-tail" d="M131 22L111.5 1" />
        </svg>
      </button>

      {rows.map((row, rowIndex) => (
        <div
          className={`archive__row archive__row--${row.direction}`}
          key={row.direction}
          {...rowHandlers(rowIndex)}
        >
          <div className="archive__track" ref={element => { trackElements.current[rowIndex] = element }}>
            {/* 같은 줄을 두 번 이어 붙여 끊김 없이 반복합니다. 두 번째 줄은 화면 읽기 프로그램·Tab 이동에서 뺍니다. */}
            {[0, 1].map(copy => (
              <ul className="archive__sequence" key={copy} aria-hidden={copy === 1 || undefined}>
                {row.photos.map((photo, index) => {
                  const frameStyle = { '--w': photo.width, '--h': photo.height } as CSSProperties
                  return (
                    <li key={index}>
                      <button
                        className="archive__photo"
                        style={frameStyle}
                        tabIndex={copy === 1 ? -1 : undefined}
                        aria-label={`${photo.alt} 크게 보기`}
                        onClick={() => setSelected(photo)}
                        // 마우스를 올리면 원본을 미리 불러와서, 눌렀을 때 바로 크게 보이게 합니다.
                        onPointerEnter={() => { new Image().src = photo.full }}
                      >
                        <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ))}
            </div>
          </div>
      ))}

      <img className="archive__spotlight" src={spotlight} alt="" width={320} height={378} />
      <h2 id="archive-title" className="section-heading archive__title">Artist Gallery</h2>

      <dialog
        ref={viewer}
        className="archive-viewer"
        aria-label={selected ? `${selected.alt} 크게 보기` : undefined}
        data-empty={!selected}
        onClose={() => setSelected(null)}
        onClick={closeViewerOnBackdrop}
      >
        {selected && (
          <img
            className="archive-viewer__image"
            src={selected.full}
            alt={selected.alt}
            width={selected.fullWidth}
            height={selected.fullHeight}
            decoding="async"
          />
        )}
      </dialog>
    </dialog>
  )
}
