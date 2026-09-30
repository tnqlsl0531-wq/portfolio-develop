/*
 * 글자가 한 줄로 끝없이 흐르는 띠(마퀴)
 * 원본: React Bits Curved Loop — https://reactbits.dev/text-animations/curved-loop
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/CurvedLoop
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 원본과 같은 점: 글자를 SVG 경로(textPath)에 올려 startOffset을 매 프레임 옮기고, 한 벌 길이만큼 가면 처음으로 돌아갑니다.
 *   마우스로 끌어서 움직일 수 있고, 마지막으로 끈 방향으로 계속 흐릅니다. curveAmount가 0이면 곧은 줄입니다.
 * 원본에서 바꾼 점
 * - 화면 크기를 피그마 프레임(1920 기준)에 맞추려고 viewBox 폭·높이·글자 위치를 받습니다.
 * - 속도는 '60fps 기준 한 프레임에 움직이는 양'으로 같지만, 화면 주사율(120Hz 등)과 상관없이 같은 빠르기가 되도록 시간으로 계산합니다.
 * - 화면 밖이거나 '동작 줄이기' 설정이면 멈춥니다.
 * - 글자 색으로 SVG 그라데이션(피그마 채우기)을 쓸 수 있게 fill을 받습니다.
 * - 가볍게(10/1, 발표 때 Zoom 공유로 더 느려져서): 곧은 줄(curveAmount 0)이면 글자를 경로에 다시 얹지 않고(매 프레임 글자 배치·다시 그리기),
 *   글자 줄 전체를 옆으로 미는 애니메이션(Web Animations, transform)으로 흐르게 합니다(StraightLoop).
 *   화면 합성만으로 움직여서 다른 계산이 바빠도 끊기지 않습니다. 끌기·끈 방향으로 계속 흐르기는 그대로입니다.
 *   이때 글자는 흰색으로 그리고, 색(그라데이션)은 쓰는 곳에서 위에 덮는 층(mix-blend-mode)으로 입힙니다(App.css .marquee-band__tint).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import './CurvedLoop.css'

interface CurvedLoopProps {
  marqueeText?: string
  speed?: number
  className?: string
  curveAmount?: number
  direction?: 'left' | 'right'
  interactive?: boolean
  /** viewBox 폭·높이(이 좌표계에서 글자 크기가 정해집니다) */
  width?: number
  height?: number
  /** 글자가 올라갈 줄의 높이(viewBox 좌표) */
  lineY?: number
  /** 글자 채우기. 예: 'url(#gradient)' */
  fill?: string
  /** <defs> 안에 넣을 그라데이션 등 */
  defs?: ReactNode
}

const loopText = (marqueeText: string) => {
  const hasTrailing = /\s| $/.test(marqueeText)
  return (hasTrailing ? marqueeText.replace(/\s+$/, '') : marqueeText) + ' '
}

export default function CurvedLoop(props: CurvedLoopProps) {
  // 곧은 줄이면 가벼운 방식(StraightLoop)으로 흐르게 합니다.
  if ((props.curveAmount ?? 400) === 0) return <StraightLoop {...props} />
  return <CurvedPathLoop {...props} />
}

function CurvedPathLoop({
  marqueeText = '',
  speed = 2,
  className,
  curveAmount = 400,
  direction = 'left',
  interactive = true,
  width = 1440,
  height = 120,
  lineY = 40,
  fill,
  defs,
}: CurvedLoopProps) {
  const text = useMemo(() => loopText(marqueeText), [marqueeText])

  const jacket = useRef<HTMLDivElement>(null)
  const measureRef = useRef<SVGTextElement>(null)
  const textPathRef = useRef<SVGTextPathElement>(null)
  const [spacing, setSpacing] = useState(0)
  const [dragging, setDragging] = useState(false)
  const uid = useId().replace(/:/g, '')
  const pathId = `curve-${uid}`
  // 원본과 같은 모양(왼쪽 밖 → 가운데 휘어짐 → 오른쪽 밖)을 viewBox 폭에 맞춰 늘렸습니다.
  const scale = width / 1440
  const pathD = `M${-100 * scale},${lineY} Q${500 * scale},${lineY + curveAmount} ${1540 * scale},${lineY}`

  const dragRef = useRef(false)
  const lastXRef = useRef(0)
  const dirRef = useRef<'left' | 'right'>(direction)
  const velRef = useRef(0)
  const offsetRef = useRef(0)

  const totalText = spacing ? Array(Math.ceil((width * 1.25) / spacing) + 2).fill(text).join('') : text
  const ready = spacing > 0

  // 글자 한 벌의 길이를 잽니다(글꼴을 다 불러온 뒤 다시 잽니다).
  useEffect(() => {
    const measure = () => { if (measureRef.current) setSpacing(measureRef.current.getComputedTextLength()) }
    measure()
    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure() })
    return () => { alive = false }
  }, [text, className])

  // 한 벌 길이(spacing)만큼 넘어가면 반대쪽으로 되돌려 끊김 없이 이어지게 합니다.
  const spacingRef = useRef(0)
  const placeRef = useRef((value: number) => {
    const length = spacingRef.current
    let next = value
    if (next <= -length) next += length
    if (next > 0) next -= length
    offsetRef.current = next
    textPathRef.current?.setAttribute('startOffset', `${next}px`)
  })

  useEffect(() => {
    if (!spacing) return
    spacingRef.current = spacing
    offsetRef.current = -spacing
    textPathRef.current?.setAttribute('startOffset', `${-spacing}px`)
  }, [spacing])

  useEffect(() => {
    if (!ready) return
    const element = jacket.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let onScreen = true
    let frame = 0
    let last = 0
    const step = (now: number) => {
      const frames = last ? Math.min(4, (now - last) / (1000 / 60)) : 1
      last = now
      if (!dragRef.current && textPathRef.current) {
        const delta = (dirRef.current === 'right' ? speed : -speed) * frames
        placeRef.current(offsetRef.current + delta)
      }
      frame = requestAnimationFrame(step)
    }
    const update = () => {
      cancelAnimationFrame(frame)
      frame = 0
      last = 0
      if (onScreen && !reduced.matches) frame = requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      update()
    })
    if (element) observer.observe(element)
    reduced.addEventListener('change', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      reduced.removeEventListener('change', update)
    }
  }, [speed, ready])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    dragRef.current = true
    setDragging(true)
    lastXRef.current = event.clientX
    velRef.current = 0
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current || !textPathRef.current) return
    // 화면에서 끈 거리를 viewBox 좌표로 바꿔서 손가락·마우스와 글자가 같이 움직이게 합니다.
    const box = (event.currentTarget.querySelector('svg') ?? event.currentTarget).getBoundingClientRect()
    const dx = (event.clientX - lastXRef.current) * (width / Math.max(1, box.width))
    lastXRef.current = event.clientX
    velRef.current = dx
    placeRef.current(offsetRef.current + dx)
  }

  const endDrag = () => {
    if (!interactive || !dragRef.current) return
    dragRef.current = false
    setDragging(false)
    if (velRef.current !== 0) dirRef.current = velRef.current > 0 ? 'right' : 'left'
  }

  return (
    <div
      ref={jacket}
      className="curved-loop-jacket"
      style={{ visibility: ready ? 'visible' : 'hidden', cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <svg className="curved-loop-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <text ref={measureRef} className={className} xmlSpace="preserve" style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
          {defs}
        </defs>
        {ready && (
          <text className={className} xmlSpace="preserve" fill={fill}>
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={`${-spacing}px`} xmlSpace="preserve">
              {totalText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  )
}

type LoopControl = {
  grab: () => void
  move: (dx: number) => void
  release: (velocity: number) => void
}

/*
 * 곧은 줄 마퀴(10/1 가볍게): 글자 줄(한 벌을 화면 폭 + 한 벌만큼 이어 붙임)을 transform으로 한 벌 길이만큼 옆으로 밀고 처음으로 돌아가길 반복합니다.
 * 속도(speed)는 원본과 같은 '60fps 기준 한 프레임에 움직이는 양(viewBox 좌표)'입니다.
 */
function StraightLoop({
  marqueeText = '',
  speed = 2,
  className,
  direction = 'left',
  interactive = true,
  width = 1440,
  height = 120,
  lineY = 40,
}: CurvedLoopProps) {
  const text = useMemo(() => loopText(marqueeText), [marqueeText])
  const jacket = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const measureRef = useRef<SVGTextElement>(null)
  const [spacing, setSpacing] = useState(0)
  const [dragging, setDragging] = useState(false)
  const ready = spacing > 0
  const copies = ready ? Math.ceil(width / spacing) + 1 : 1
  const trackWidth = ready ? spacing * copies : width
  const control = useRef<LoopControl | null>(null)
  const dirRef = useRef<'left' | 'right'>(direction)
  const offsetRef = useRef(0)
  const pointer = useRef<{ x: number; velocity: number } | null>(null)

  // 글자 한 벌의 길이를 잽니다(글꼴을 다 불러온 뒤 다시 잽니다).
  useEffect(() => {
    const measure = () => { if (measureRef.current) setSpacing(measureRef.current.getComputedTextLength()) }
    measure()
    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure() })
    return () => { alive = false }
  }, [text, className])

  useEffect(() => {
    const element = track.current
    const box = jacket.current
    if (!ready || !element || !box || typeof element.animate !== 'function') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const shift = (spacing / trackWidth) * 100 // 한 벌 길이 = 줄 폭의 몇 %
    const duration = (spacing / (Math.max(.01, Math.abs(speed)) * 60)) * 1000
    const wrap = (value: number) => {
      let next = value
      while (next <= -spacing) next += spacing
      while (next > 0) next -= spacing
      return next
    }
    // 위치(offset, -한 벌 ~ 0)와 애니메이션 시간을 서로 바꿉니다. 왼쪽으로 흐르면 0 → -한 벌, 오른쪽이면 -한 벌 → 0.
    const timeFor = (dir: 'left' | 'right', offset: number) => {
      const t = dir === 'left' ? -offset / spacing : (offset + spacing) / spacing
      return (((t % 1) + 1) % 1) * duration
    }
    const offsetOf = (animation: Animation, dir: 'left' | 'right') => {
      const t = ((Number(animation.currentTime) || 0) % duration) / duration
      return dir === 'left' ? -t * spacing : -spacing + t * spacing
    }
    let animation: Animation | null = null
    let onScreen = true
    const sync = () => {
      if (!animation) return
      if (onScreen && !pointer.current && !reduced.matches) animation.play()
      else animation.pause()
    }
    const make = (dir: 'left' | 'right', offset: number) => {
      animation?.cancel()
      const from = { transform: 'translate3d(0, 0, 0)' }
      const to = { transform: `translate3d(${-shift}%, 0, 0)` }
      animation = element.animate(dir === 'left' ? [from, to] : [to, from], { duration, iterations: Infinity, easing: 'linear' })
      animation.currentTime = timeFor(dir, offset)
      sync()
    }
    control.current = {
      grab() {
        if (!animation) return
        offsetRef.current = offsetOf(animation, dirRef.current)
        animation.pause()
      },
      move(dx) {
        if (!animation) return
        offsetRef.current = wrap(offsetRef.current + dx)
        animation.currentTime = timeFor(dirRef.current, offsetRef.current)
      },
      release(velocity) {
        const next = velocity > 0 ? 'right' : velocity < 0 ? 'left' : dirRef.current
        if (next !== dirRef.current) {
          dirRef.current = next
          make(next, offsetRef.current)
        } else sync()
      },
    }
    make(dirRef.current, offsetRef.current)
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    })
    observer.observe(box)
    reduced.addEventListener('change', sync)
    return () => {
      if (animation) offsetRef.current = offsetOf(animation, dirRef.current)
      animation?.cancel()
      control.current = null
      observer.disconnect()
      reduced.removeEventListener('change', sync)
    }
  }, [ready, spacing, trackWidth, speed])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !ready) return
    pointer.current = { x: event.clientX, velocity: 0 }
    setDragging(true)
    control.current?.grab()
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = pointer.current
    if (!interactive || !drag) return
    // 화면에서 끈 거리를 viewBox 좌표로 바꿔서 손가락·마우스와 글자가 같이 움직이게 합니다.
    const box = (track.current ?? event.currentTarget).getBoundingClientRect()
    const dx = (event.clientX - drag.x) * (trackWidth / Math.max(1, box.width))
    drag.x = event.clientX
    drag.velocity = dx
    control.current?.move(dx)
  }
  const endDrag = () => {
    const drag = pointer.current
    if (!interactive || !drag) return
    pointer.current = null
    setDragging(false)
    control.current?.release(drag.velocity)
  }

  return (
    <div
      ref={jacket}
      className="curved-loop-jacket curved-loop-jacket--straight"
      style={{ visibility: ready ? 'visible' : 'hidden', cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div ref={track} className="curved-loop-track" style={{ '--loop-track': `${(trackWidth / width) * 100}%` } as CSSProperties}>
        <svg className="curved-loop-svg" viewBox={`0 0 ${trackWidth} ${height}`} aria-hidden="true">
          <text ref={measureRef} className={className} xmlSpace="preserve" style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}>
            {text}
          </text>
          {ready && (
            <text className={className} x={0} y={lineY} xmlSpace="preserve">
              {Array(copies).fill(text).join('')}
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
