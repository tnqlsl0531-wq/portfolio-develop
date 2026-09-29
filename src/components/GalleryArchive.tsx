import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { archiveRows } from '../archivePhotos'
import type { ArchivePhoto } from '../archivePhotos'
import spotlight from '../assets/design/gallery-spotlight.svg'
import './GalleryArchive.css'

/* Artist Gallery 아카이브 화면 (피그마 109-8 → 사진을 채운 334-2) + 사진 크게 보기 (피그마 96-192)
   - 'Artist Gallery 자세히 보러가기'를 누르면 버튼 자리에서 원이 커지며 화면을 채웁니다(피그마 메모 94:1160).
   - 윗줄은 왼쪽, 아랫줄은 오른쪽으로 천천히 흐릅니다(마퀴). 사진 목록은 src/archivePhotos.ts에 있습니다.
   - 사진은 평소에 채도를 살짝 낮춰(회색빛이 돌지 않을 만큼) 보여주고, 마우스를 올리면 그 줄만 멈추고
     사진이 살짝(4%) 커지며 원래 색으로 돌아옵니다.
   - 사진을 누르면 뒤 화면이 흐려지고(6px) 어두워지며(#171717 58%) 가운데에 자르지 않은 원본 사진이 크게 뜹니다.
   - Esc, 뒤 배경 클릭으로 닫습니다. 아카이브 화면은 왼쪽 위 '돌아가기' 버튼으로도 닫습니다. */

export type ArchiveOrigin = { x: number; y: number }

const GAP = 34 // 사진 사이 간격
const SPEED = 40 // 흐르는 속도(1920 화면 기준 1초에 40px). 숫자가 작을수록 느려집니다.

const rows = [
  { direction: 'left', photos: archiveRows.top },
  { direction: 'right', photos: archiveRows.bottom },
] as const

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

      {rows.map(row => {
        // 한 바퀴 길이(사진 폭 + 간격)를 속도로 나눠, 사진 수가 바뀌어도 같은 속도로 흐르게 합니다.
        const loopWidth = row.photos.reduce((sum, photo) => sum + photo.width + GAP, 0)
        const trackStyle = { '--duration': `${loopWidth / SPEED}s` } as CSSProperties
        return (
          <div className={`archive__row archive__row--${row.direction}`} key={row.direction}>
            <div className="archive__track" style={trackStyle}>
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
        )
      })}

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
