import { useEffect, useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { animate } from 'motion'
import artwork from '../assets/backstage/backstage-choice-art.png'
import './BackstageChoice.css'

// React Bits ChromaGrid: radius 100, damping .55, fadeOut .2.
// Reveal a grayscale photo through the darkness; keep the label readable.
export default function BackstageChoice({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const position = useRef({ x: 0, y: 0 })
  const movement = useRef<ReturnType<typeof animate> | null>(null)
  const active = useRef(false)

  useEffect(() => () => movement.current?.stop(), [])

  function paint(x: number, y: number) {
    position.current = { x, y }
    button.current?.style.setProperty('--backstage-x', `${x}px`)
    button.current?.style.setProperty('--backstage-y', `${y}px`)
  }

  function reveal(x: number, y: number) {
    const element = button.current
    if (!element) return
    movement.current?.stop()
    const immediate = !active.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    active.current = true
    element.dataset.spotlight = 'true'
    if (immediate) {
      paint(x, y)
      return
    }
    const start = { ...position.current }
    movement.current = animate(0, 1, {
      duration: 0.55,
      ease: progress => 1 - (1 - progress) ** 4, // GSAP power3.out from the reference.
      onUpdate: progress => paint(start.x + (x - start.x) * progress, start.y + (y - start.y) * progress),
    })
  }

  function follow(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'touch' && event.type !== 'pointerdown') return
    const rect = event.currentTarget.getBoundingClientRect()
    reveal(event.clientX - rect.left, event.clientY - rect.top)
  }

  function hide() {
    movement.current?.stop()
    active.current = false
    if (button.current) button.current.dataset.spotlight = 'false'
  }

  function focusSpotlight() {
    const element = button.current
    if (!element?.matches(':focus-visible')) return
    const rect = element.getBoundingClientRect()
    reveal(rect.width / 2, rect.height / 2)
  }

  return (
    <button
      ref={button}
      type="button"
      className="stage-choice stage-choice--back"
      onClick={onClick}
      onPointerEnter={follow}
      onPointerMove={follow}
      onPointerDown={follow}
      onPointerUp={event => { if (event.pointerType === 'touch') hide() }}
      onPointerLeave={() => { hide(); focusSpotlight() }}
      onPointerCancel={hide}
      onFocus={focusSpotlight}
      onBlur={hide}
    >
      <span className="backstage-choice__reveal" aria-hidden="true">
        <img src={artwork} width={432} height={192} alt="" draggable={false} />
      </span>
      {children}
    </button>
  )
}
