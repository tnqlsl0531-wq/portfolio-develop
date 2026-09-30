import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent, ReactNode } from 'react'
import grandma from '../assets/onstage/grandma.png'
import bottle from '../assets/onstage/bottle.png'
import cup from '../assets/onstage/cup.png'
import jaduMascot from '../assets/onstage/jadu-mascot.webp'
import type { Project } from '../portfolio'
import './OnStageChoice.css'

// 그림 조각마다 CSS 변수로 등장 방법을 정합니다(OnStageChoice.css).
// --enter-x/--enter-y: 숨어 있을 때 위치, --enter-rotate/--enter-scale: 숨어 있을 때 기울기·크기,
// --enter-delay/--enter-duration(ms): 언제부터 얼마 동안 들어오는지, --enter-ease: 들어오는 느낌(곡선)
const DEFAULT_ENTER = { rotate: '0deg', scale: '.9', stagger: 110, duration: 360, ease: 'cubic-bezier(.16,1,.3,1)' }

export default function OnStageChoice({ projectId = 'kooksoondang', href, onClick, children }: { projectId?: Project['id']; href?: string; onClick?: () => void; children: ReactNode }) {
  const art = useRef<HTMLSpanElement>(null)
  const animations = useRef<Animation[]>([])
  const total = useRef(580)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const active = hovered || focused
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pieces = art.current?.querySelectorAll<HTMLElement>('.onstage-choice__piece')
    if (!pieces) return
    // 조각마다 CSS에 적힌 등장 방법을 읽어 한 개의 타임라인(모든 조각이 다 들어오는 데 걸리는 시간)으로 만듭니다.
    // 마우스가 나가면 같은 타임라인을 거꾸로 재생해서, 들어오던 중간에 나가도 자연스럽게 되돌아갑니다.
    const read = (style: CSSStyleDeclaration, name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
    const specs = Array.from(pieces, (piece, index) => {
      const style = getComputedStyle(piece)
      return {
        piece,
        hidden: { opacity: 0, transform: `translate(${read(style, '--enter-x', '0%')}, ${read(style, '--enter-y', '0%')}) rotate(${read(style, '--enter-rotate', DEFAULT_ENTER.rotate)}) scale(${read(style, '--enter-scale', DEFAULT_ENTER.scale)})` },
        delay: Number(read(style, '--enter-delay', String(index * DEFAULT_ENTER.stagger))),
        duration: Number(read(style, '--enter-duration', String(DEFAULT_ENTER.duration))),
        ease: read(style, '--enter-ease', DEFAULT_ENTER.ease),
      }
    })
    total.current = Math.max(...specs.map(spec => spec.delay + spec.duration))
    animations.current = specs.map(({ piece, hidden, delay, duration, ease }) => {
      const visible = { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' }
      const start = delay / total.current
      const end = (delay + duration) / total.current
      const frames: Keyframe[] = [
        ...(start > 0 ? [{ ...hidden, offset: 0 }] : []),
        { ...hidden, offset: start, easing: ease },
        { ...visible, offset: end },
        ...(end < 1 ? [{ ...visible, offset: 1 }] : []),
      ]
      const animation = piece.animate(frames, { duration: total.current, fill: 'both' })
      animation.pause()
      animation.currentTime = activeRef.current ? total.current : 0
      return animation
    })
    const syncReducedMotion = () => {
      if (!media.matches) return
      for (const animation of animations.current) {
        animation.pause()
        animation.currentTime = activeRef.current ? total.current : 0
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
      // 이미 가야 할 자리(보임 = 끝, 숨김 = 0)에 있으면 재생하지 않고 그 자리에 둡니다.
      // 숨김(0)에서 거꾸로 play()를 부르면 브라우저가 끝(다 보임)으로 되감은 뒤 거꾸로 재생해서,
      // 작품 선택 창이 열릴 때 할머니·병·잔이 호버하지 않았는데도 잠깐 다 나와 있다가 들어가던 문제가 있었습니다.
      const time = Number(animation.currentTime ?? 0)
      const arrived = active ? time >= total.current : time <= 0
      if (reduce || arrived) {
        animation.pause()
        animation.currentTime = active ? total.current : 0
      } else {
        animation.updatePlaybackRate(active ? 1 : -1)
        animation.play()
      }
    }
  }, [active])

  // 창이 열릴 때 마우스가 이미 버튼 자리에 있으면 브라우저가 '올라왔다'고 알려서 그림이 바로 나와 있었습니다.
  // 그래서 마우스가 실제로 움직였을 때만 들어오게 하고(pointermove + 움직인 거리), 나가면 바로 나가게 합니다.
  const interaction = {
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch' || hovered) return
      if (event.movementX !== 0 || event.movementY !== 0) setHovered(true)
    },
    onPointerLeave: () => setHovered(false),
    onPointerCancel: () => setHovered(false),
    onFocus: (event: FocusEvent<HTMLElement>) => setFocused(event.currentTarget.matches(':focus-visible')),
    onBlur: () => setFocused(false),
  }

  // 작품마다 호버 때 나오는 그림이 다릅니다. 국순당: 할머니·병·잔(피그마 296:186) / 자두야: 두더지 마스코트(피그마 358-244의 360:340)
  const content = <>
    <span ref={art} className={`onstage-choice__art onstage-choice__art--${projectId}`} aria-hidden="true">
      {projectId === 'jadu' ? (
        <span className="onstage-choice__piece onstage-choice__jadu">
          <span className="onstage-choice__jadu-body"><img src={jaduMascot} width={368} height={368} alt="" draggable={false} /></span>
        </span>
      ) : <>
        <span className="onstage-choice__piece onstage-choice__grandma"><img src={grandma} width={264} height={324} alt="" draggable={false} /></span>
        <span className="onstage-choice__piece onstage-choice__bottle"><img src={bottle} width={206} height={248} alt="" draggable={false} /></span>
        <span className="onstage-choice__piece onstage-choice__cup"><img src={cup} width={132} height={131} alt="" draggable={false} /></span>
      </>}
    </span>
    {children}
  </>

  return href
    ? <a {...interaction} className="stage-choice stage-choice--on" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <button {...interaction} className="stage-choice stage-choice--on" type="button" onClick={onClick}>{content}</button>
}
