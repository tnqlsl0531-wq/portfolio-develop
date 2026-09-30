import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent, WheelEvent } from 'react'
import { archiveRows } from '../archivePhotos'
import type { ArchivePhoto } from '../archivePhotos'
import CircularGallery from './CircularGallery'
import type { CircularGalleryHandle, GalleryTile } from './CircularGallery'
import spotlight from '../assets/design/gallery-spotlight.svg'
import './GalleryArchive.css'

/* Artist Gallery 아카이브 화면 (피그마 109-8 → 사진을 채운 334-2) + 사진 크게 보기 (피그마 96-192)
   - 'Artist Gallery 자세히 보러가기'를 누르면 버튼 자리에서 원이 커지며 화면을 채웁니다(피그마 메모 94:1160).
   - 윗줄은 왼쪽, 아랫줄은 오른쪽으로 천천히 흐릅니다. 사진 목록은 src/archivePhotos.ts에 있습니다.
   - 사진은 CircularGallery.tsx(React Bits Circular Gallery)가 WebGL로 그립니다. 물결치듯 살짝 일렁이고
     모서리가 둥글며, 줄을 끌거나 휠을 굴리면 목표 위치를 부드럽게 따라옵니다(scrollEase 0.04).
     여기 있는 버튼은 그대로 위에 겹쳐 두어, 누르면 원본 크게 보기·키보드 이동·화면 읽기가 예전처럼 동작합니다.
     WebGL을 쓸 수 없는 기기에서는 캔버스 없이 원래 <img>가 그대로 보입니다(물결만 없습니다).
   - 사진은 평소에 채도를 살짝 낮춰(회색빛이 돌지 않을 만큼) 보여주고, 마우스를 올리면 그 줄만 멈추고
     사진이 살짝(4%) 커지며 원래 색으로 돌아옵니다.
   - 사진을 누르면 뒤 화면이 흐려지고(6px) 어두워지며(#171717 58%) 가운데에 자르지 않은 원본 사진이 크게 뜹니다.
   - Esc, 뒤 배경 클릭으로 닫습니다. 아카이브 화면은 왼쪽 위 '돌아가기' 버튼으로도 닫습니다. */

export type ArchiveOrigin = { x: number; y: number }

const GAP = 34 // 사진 사이 간격
const SPEED = 40 // 저절로 흐르는 속도(1초에 40px). 숫자가 작을수록 느려집니다.

// start: 처음 열었을 때 한 벌 길이 중 어디쯤에서 시작할지(두 줄이 같은 모양으로 시작하지 않게)
const rows = [
  { direction: 'left', photos: archiveRows.top, start: 0.3 },
  { direction: 'right', photos: archiveRows.bottom, start: 0.4 },
] as const

// 두 줄 사진을 한 목록으로 이어서 캔버스에 넘깁니다. ROW_BASE는 각 줄이 그 목록에서 시작하는 번호입니다.
const ALL_PHOTOS = rows.flatMap(row => row.photos)
const ROW_BASE = rows.map((_, index) => rows.slice(0, index).reduce((sum, row) => sum + row.photos.length, 0))

// 움직임 설정
const DRAG = {
  threshold: 6, // 이만큼(px) 움직여야 '끌기'로 봅니다. 그보다 적게 움직이면 사진 누르기(크게 보기)입니다.
  hoverStop: 0.25, // 사진에 마우스를 올렸을 때 멈추는 시간 느낌(초)
  wheel: 0.6, // 마우스 휠을 굴렸을 때 옆으로 가는 정도
}
// React Bits Circular Gallery의 scrollEase 0.04 — '목표 위치를 매 프레임 4%씩 따라간다'는 뜻입니다.
// 1초에 60번 그리는 화면 기준 값이라, 주사율이 달라도 같게 느껴지도록 시간(초)으로 바꿔 둡니다.
const SCROLL_EASE = 0.04
const SCROLL_TAU = -(1 / 60) / Math.log(1 - SCROLL_EASE) // ≈ 0.41초
// 마우스를 올린 사진이 커지고 색이 돌아오는 정도·시간 느낌(예전 CSS의 4% · 400ms와 같습니다)
const HOVER = { scale: 0.04, tau: 0.17 }

// 한 벌 길이 안으로 되돌려(-loop < x ≤ 0) 두 벌을 이어 붙인 줄이 끊김 없이 이어지게 합니다.
const wrapOffset = (x: number, loop: number) => {
  const r = x % loop
  return r > 0 ? r - loop : r
}

type RowMotion = {
  target: number // 가야 할 자리(px) — 저절로 흐르기·끌기·휠이 이 값을 움직입니다.
  current: number // 지금 그려지는 자리(px) — 목표를 부드럽게 따라옵니다(scrollEase).
  last: number // 바로 전 프레임의 current(물결 세기를 구하는 데 씁니다)
  loop: number // 한 벌 길이(px)
  base: number // 저절로 흐르는 속도(px/초, 왼쪽은 -)
  hover: boolean
  focus: boolean
  drag: null | { id: number; startX: number; startTarget: number; active: boolean }
}

/** 캔버스에 그릴 사진 한 장의 제자리(줄이 안 움직일 때 기준). phase는 물결 시작점입니다. */
type TileSpot = { photo: number; x: number; y: number; w: number; h: number; phase: number }

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
  const photoElements = useRef<(HTMLButtonElement | null)[][]>(rows.map(() => []))
  const motions = useRef<RowMotion[]>(rows.map(() => ({ target: 0, current: 0, last: 0, loop: 0, base: 0, hover: false, focus: false, drag: null })))
  // 캔버스에 그릴 사진들의 제자리 + 마우스를 올린 정도(0~1)
  const spots = useRef<TileSpot[][]>(rows.map(() => []))
  const hoverAmount = useRef<number[][]>(rows.map(() => []))
  const hoverIndex = useRef<number[]>(rows.map(() => -1))
  const saturate = useRef(.75)
  const gallery = useRef<CircularGalleryHandle>(null)
  const [webglReady, setWebglReady] = useState(false)
  const suppressClick = useRef(false)
  const pausedAll = useRef(false)
  useEffect(() => { pausedAll.current = selected !== null || closing }, [selected, closing])

  // 한 벌 길이를 재고 속도를 맞춥니다(창 크기가 바뀌면 다시 재고, 보던 위치는 비율대로 유지).
  const measureRows = () => {
    const dialog = archive.current
    if (!dialog) return
    // 채도는 CSS의 --archive-saturate 한 곳에서만 정합니다(캔버스도 같은 값을 씁니다).
    saturate.current = Number.parseFloat(getComputedStyle(dialog).getPropertyValue('--archive-saturate')) || .75
    rows.forEach((row, index) => {
      const track = trackElements.current[index]
      const motion = motions.current[index]
      if (!track) return
      const loop = track.scrollWidth / 2
      if (!loop) return
      // 한 벌 길이(사진 폭 + 간격)를 SPEED로 나눈 시간에 한 벌을 지나가게 합니다(사진 수가 바뀌어도 같은 속도).
      const loopUnits = row.photos.reduce((sum, photo) => sum + photo.width + GAP, 0)
      const first = !motion.loop
      const ratio = motion.loop ? loop / motion.loop : 0
      motion.current = first ? -row.start * loop : motion.current * ratio
      motion.target = first ? motion.current : motion.target * ratio
      motion.last = motion.current
      motion.loop = loop
      motion.base = (loop * SPEED / loopUnits) * (row.direction === 'left' ? -1 : 1)
      track.style.transform = `translate3d(${motion.current}px, 0, 0)`

      // 사진 버튼의 제자리를 재 둡니다(줄을 옮기는 transform은 제자리에 영향을 주지 않습니다).
      // 버튼의 offset은 '줄' 기준이므로, 캔버스와 같은 기준(아카이브 화면)으로 맞추려면 줄의 자리를 더합니다.
      // 같은 줄이 두 벌 이어져 있으므로, 사진 번호는 한 벌의 사진 수로 나눈 나머지입니다.
      const rowElement = track.parentElement
      const rowLeft = rowElement?.offsetLeft ?? 0
      const rowTop = rowElement?.offsetTop ?? 0
      const buttons = photoElements.current[index] ?? []
      spots.current[index] = buttons.flatMap((button, order) => button ? [{
        photo: ROW_BASE[index] + order % row.photos.length,
        x: rowLeft + button.offsetLeft + button.offsetWidth / 2,
        y: rowTop + button.offsetTop + button.offsetHeight / 2,
        w: button.offsetWidth,
        h: button.offsetHeight,
        // 사진마다 물결이 다르게(시작하는 때 + 굽이 수) 나오도록 값을 흩어 놓습니다.
        phase: (order * 2.399 + index * 5.117) % 6.283,
      }] : [])
      if (hoverAmount.current[index].length !== spots.current[index].length) {
        hoverAmount.current[index] = spots.current[index].map(() => 0)
      }
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
      const canvasWidth = window.innerWidth
      const tiles: GalleryTile[] = []
      const still = reduced.matches

      rows.forEach((_, index) => {
        const motion = motions.current[index]
        const track = trackElements.current[index]
        if (!track || !motion.loop) return
        // 멈춰야 할 때(사진에 마우스·키보드 초점, 크게 보는 중, 움직임 줄이기)는 목표를 더 밀지 않습니다.
        const stop = pausedAll.current || motion.hover || motion.focus || still
        const dragging = motion.drag?.active === true
        if (!dragging && !stop) motion.target += motion.base * dt
        // 목표 자리를 부드럽게 따라갑니다(scrollEase). 멈출 때는 조금 더 빨리 잦아듭니다.
        const tau = !dragging && stop ? DRAG.hoverStop : SCROLL_TAU
        motion.current += (motion.target - motion.current) * (1 - Math.exp(-dt / tau))
        // 한 벌 길이 안으로 되돌립니다. 목표도 같은 만큼 옮겨 둘 사이의 거리를 지킵니다.
        const wrapped = wrapOffset(motion.current, motion.loop)
        motion.target += wrapped - motion.current
        motion.last += wrapped - motion.current
        motion.current = wrapped
        track.style.transform = `translate3d(${motion.current}px, 0, 0)`

        // 이번 프레임에 움직인 거리 — 빠르게 끌수록 물결이 커집니다(원본의 uSpeed).
        const moved = motion.current - motion.last
        motion.last = motion.current
        const amounts = hoverAmount.current[index]
        spots.current[index].forEach((spot, order) => {
          const wanted = hoverIndex.current[index] === order ? 1 : 0
          amounts[order] += (wanted - (amounts[order] ?? 0)) * (1 - Math.exp(-dt / HOVER.tau))
          const amount = amounts[order]
          const x = spot.x + motion.current
          // 화면 밖에 있는 사진은 그리지 않습니다.
          if (x + spot.w < 0 || x - spot.w > canvasWidth) return
          const grow = 1 + HOVER.scale * amount
          tiles.push({
            photo: spot.photo,
            x, y: spot.y,
            w: spot.w * grow, h: spot.h * grow,
            saturate: saturate.current + (1 - saturate.current) * amount,
            speed: moved,
            phase: spot.phase,
          })
        })
      })

      gallery.current?.draw(tiles, !still)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    // 캔버스가 준비되면 원래 <img>를 감추고 캔버스가 그린 그림만 보여줍니다(GalleryArchive.css).
    setWebglReady(gallery.current?.ready() === true)
    window.addEventListener('resize', measureRows)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measureRows)
    }
    // measureRows는 ref만 쓰므로 다시 만들 필요가 없습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // 마우스가 올라간(또는 키보드로 고른) 사진 번호를 기억합니다. 그 사진만 커지고 원래 색이 됩니다.
  const tileOf = (target: EventTarget | null) => {
    const button = (target as Element | null)?.closest?.('.archive__photo') as HTMLElement | null
    const order = button?.dataset.tile
    return order === undefined ? -1 : Number(order)
  }

  const rowHandlers = (index: number) => {
    const motion = () => motions.current[index]
    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
      const drag = motion().drag
      if (!drag || drag.id !== event.pointerId) return
      if (drag.active) {
        // 놓으면 목표 자리가 그대로 남아, 부드럽게 따라가다가 다시 저절로 흐릅니다(원본의 scrollEase).
        suppressClick.current = true
        delete event.currentTarget.dataset.dragging
        // 놓은 자리가 사진 위면(마우스) 그 줄은 다시 멈춥니다.
        const under = document.elementFromPoint(event.clientX, event.clientY)
        const onPhoto = event.pointerType === 'mouse' && under !== null && event.currentTarget.contains(under) && under.closest('.archive__photo') !== null
        motion().hover = onPhoto
        hoverIndex.current[index] = onPhoto ? tileOf(under) : -1
      }
      motion().drag = null
    }
    return {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        suppressClick.current = false
        motion().drag = { id: event.pointerId, startX: event.clientX, startTarget: motion().target, active: false }
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        const drag = motion().drag
        if (!drag || drag.id !== event.pointerId) return
        if (!drag.active) {
          if (Math.abs(event.clientX - drag.startX) < DRAG.threshold) return
          // 여기서부터 끌기: 이 줄이 손가락·마우스를 계속 따라오게 잡아 둡니다.
          drag.active = true
          drag.startX = event.clientX
          drag.startTarget = motion().target
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.dataset.dragging = 'true'
          return
        }
        motion().target = drag.startTarget + (event.clientX - drag.startX)
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      // 마우스 휠로도 줄을 옆으로 굴릴 수 있습니다(원본 Circular Gallery와 같습니다).
      onWheel: (event: WheelEvent<HTMLDivElement>) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
        if (!delta) return
        motion().target -= delta * DRAG.wheel
      },
      // 끌고 난 뒤 손을 뗄 때 생기는 '클릭'으로 사진이 열리지 않게 막습니다.
      onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
        if (!suppressClick.current) return
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
      },
      // 사진 위에 마우스가 있거나 키보드로 사진을 고르면 그 줄만 멈춥니다.
      onPointerOver: (event: PointerEvent<HTMLDivElement>) => {
        const order = event.pointerType === 'mouse' ? tileOf(event.target) : -1
        motion().hover = order >= 0
        hoverIndex.current[index] = order
      },
      onPointerLeave: () => { motion().hover = false; hoverIndex.current[index] = -1 },
      onFocus: (event: FocusEvent<HTMLDivElement>) => {
        motion().focus = event.target.matches(':focus-visible')
        if (motion().focus) hoverIndex.current[index] = tileOf(event.target)
      },
      onBlur: () => { motion().focus = false; hoverIndex.current[index] = -1 },
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
      data-webgl={webglReady}
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

      {/* 사진 그림은 이 캔버스가 그립니다(React Bits Circular Gallery). 아래 버튼들은 그대로 겹쳐 두어 누르기·키보드 이동을 맡습니다. */}
      <CircularGallery ref={gallery} photos={ALL_PHOTOS} borderRadius={.06} className="archive__canvas" />

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
                  const order = copy * row.photos.length + index
                  return (
                    <li key={index}>
                      <button
                        className="archive__photo"
                        style={frameStyle}
                        data-tile={order}
                        ref={element => { photoElements.current[rowIndex][order] = element }}
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
