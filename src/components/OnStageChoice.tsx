import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent, ReactNode } from 'react'
import grandma from '../assets/onstage/grandma.png'
import bottle from '../assets/onstage/bottle.png'
import cup from '../assets/onstage/cup.png'
import './OnStageChoice.css'

export default function OnStageChoice({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
  const art = useRef<HTMLSpanElement>(null)
  const animations = useRef<Animation[]>([])
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const active = hovered || focused
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pieces = art.current?.querySelectorAll<HTMLElement>('.onstage-choice__piece')
    if (!pieces) return
    // One 580ms timeline: reverse the existing playhead, including stagger,
    // instead of removing/restarting keyframes when the pointer leaves.
    animations.current = Array.from(pieces, (piece, index) => {
      const style = getComputedStyle(piece)
      const hidden = { opacity: 0, transform: `translate(${style.getPropertyValue('--enter-x')}, ${style.getPropertyValue('--enter-y')}) scale(.9)` }
      const visible = { opacity: 1, transform: 'translate(0, 0) scale(1)' }
      const start = index * 110 / 580
      const end = (index * 110 + 360) / 580
      const frames: Keyframe[] = [
        ...(start > 0 ? [{ ...hidden, offset: 0 }] : []),
        { ...hidden, offset: start, easing: 'cubic-bezier(.16,1,.3,1)' },
        { ...visible, offset: end },
        ...(end < 1 ? [{ ...visible, offset: 1 }] : []),
      ]
      const animation = piece.animate(frames, { duration: 580, fill: 'both' })
      animation.pause()
      animation.currentTime = activeRef.current ? 580 : 0
      return animation
    })
    const syncReducedMotion = () => {
      if (!media.matches) return
      for (const animation of animations.current) {
        animation.pause()
        animation.currentTime = activeRef.current ? 580 : 0
      }
    }
    media.addEventListener('change', syncReducedMotion)
    return () => {
      media.removeEventListener('change', syncReducedMotion)
      animations.current.forEach(animation => animation.cancel())
      animations.current = []
    }
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const animation of animations.current) {
      if (reduce) {
        animation.pause()
        animation.currentTime = active ? 580 : 0
      } else {
        animation.updatePlaybackRate(active ? 1 : -1)
        animation.play()
      }
    }
  }, [active])

  const interaction = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') setHovered(true)
    },
    onPointerLeave: () => setHovered(false),
    onPointerCancel: () => setHovered(false),
    onFocus: (event: FocusEvent<HTMLElement>) => setFocused(event.currentTarget.matches(':focus-visible')),
    onBlur: () => setFocused(false),
  }

  const content = <>
    <span ref={art} className="onstage-choice__art" aria-hidden="true">
      <span className="onstage-choice__piece onstage-choice__grandma"><img src={grandma} width={264} height={324} alt="" draggable={false} /></span>
      <span className="onstage-choice__piece onstage-choice__bottle"><img src={bottle} width={206} height={248} alt="" draggable={false} /></span>
      <span className="onstage-choice__piece onstage-choice__cup"><img src={cup} width={132} height={131} alt="" draggable={false} /></span>
    </span>
    {children}
  </>

  return href
    ? <a {...interaction} className="stage-choice stage-choice--on" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <button {...interaction} className="stage-choice stage-choice--on" type="button" onClick={onClick}>{content}</button>
}
