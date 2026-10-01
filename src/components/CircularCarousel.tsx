/*
 * 둥근 무대를 따라 도는 카드 회전목마(Stage Works)
 * 원본: React Bits Circular Carousel — https://reactbits.dev/c/components/circular-carousel
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/CircularCarousel (2026-09-30 main)
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 원본과 같은 점(cylinder 모양): 카드를 원기둥 둘레에 세우고, 카드마다 세로 띠 8장(tile)으로 나눠 원기둥 면을 따라 휘게 합니다.
 *   자동 넘김(step), 끌기 + 관성(momentum) + 제자리 맞춤(snap, 스프링), 마우스를 올리면 멈춤, 마우스 위치에 따라 살짝 기울기(parallax),
 *   빨리 돌 때 원이 살짝 커짐(stretch), 뒤로 갈수록 흐려짐(depthFade), 카드 안쪽 면 어둡게(innerShade), 처음 보일 때 아래에서 올라옴(rise).
 * 원본에서 바꾼 점
 * - rise: 카드가 통째로 날아오르는 대신, 제자리 카드 틀 안에서 아래 → 위로 차오릅니다(무대 바닥 틈에서 올라오는 느낌, 앞 카드부터 차례로).
 * - 사진 대신 작품 카드(글·로고)를 띠마다 그립니다(띠마다 같은 카드를 옆으로 밀어서 잘라 보여줌). 카드 뒷면은 글 없이 카드 바탕만.
 * - 화면에 맞춰 줄이는 fit 계산은 빼고, 부모(Stage Works 캔버스)가 정한 크기·위치(원의 중심 --cc-center-x/y) 그대로 그립니다.
 * - 처음 가운데 카드(initialIndex)를 정할 수 있고, 밖에서 특정 카드로 돌리기(focus)를 부를 수 있습니다(공연 순서 목록).
 * - 카드 모양은 원기둥(cylinder) 하나만 남기고, 휠 스크롤·캡션은 뺐습니다.
 * - 안쪽 면 그늘 색(innerColor)을 고를 수 있게 했습니다(밝은 페이지에서 검정 그늘이 회색 벽처럼 보여서).
 */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import './CircularCarousel.css'

export type CircularCarouselHandle = { focus: (index: number) => void; step: (delta: number) => void }

type Props = {
  count: number
  /** 카드 앞면(원래 크기 contentWidth × contentHeight로 그리면 cardWidth에 맞춰 줄여 보여줍니다) */
  renderCard: (index: number) => ReactNode
  /** 카드 뒷면(원기둥 안쪽에서 보이는 면) */
  renderBack?: (index: number) => ReactNode
  contentWidth: number
  contentHeight: number
  cardWidth: number
  gap?: number
  curve?: number
  tilt?: number
  perspective?: number
  intro?: 'rise' | 'none'
  autoplay?: 'step' | 'off'
  interval?: number
  direction?: 'left' | 'right'
  draggable?: boolean
  momentum?: number
  snap?: boolean
  pauseOnHover?: boolean
  parallax?: number
  stretch?: number
  depthFade?: number
  fadeColor?: string
  innerShade?: number
  /** 안쪽 면을 어둡게 할 색(원본은 검정 고정) */
  innerColor?: string
  cornerRadius?: number
  /** 카드 두께(px). 0이면 종이처럼 두께 없음. 앞면과 안쪽 면 사이를 띄우고 옆·위·아래 테두리 면을 붙입니다. */
  thickness?: number
  initialIndex?: number
  label?: string
  /** 사용법 설명 문장의 id(화면 읽기 프로그램용) */
  describedBy?: string
  cardLabel?: (index: number, active: boolean) => string
  onChange?: (index: number) => void
  /** 카드를 눌렀을 때. 이미 가운데 있던 카드면 wasActive = true */
  onCardClick?: (index: number, wasActive: boolean) => void
  /** 손으로 끌어서 돌리기 시작했을 때(누르기만 한 것은 제외) */
  onDragStart?: () => void
  className?: string
  style?: CSSProperties
}

type Sample = { time: number; angle: number }
type Press = { id: number; x: number; y: number; angle: number; moved: boolean; origin: number; samples: Sample[] }

const TILES = 8
const OVERLAP = 2.5
const DRAG_THRESHOLD = 5
const SPRING = 118
const SETTLE_SPEED = 9
const RISE_LENGTH = 1400
const TO_RAD = Math.PI / 180

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

const CircularCarousel = forwardRef<CircularCarouselHandle, Props>(function CircularCarousel({
  count,
  renderCard,
  renderBack,
  contentWidth,
  contentHeight,
  cardWidth,
  gap = 25,
  curve = 1,
  tilt = -5,
  perspective = 2500,
  intro = 'rise',
  autoplay = 'step',
  interval = 3,
  direction = 'left',
  draggable = true,
  momentum = 0.6,
  snap = true,
  pauseOnHover = true,
  parallax = 0.3,
  stretch = 0.5,
  depthFade = 0.55,
  fadeColor = '#000000',
  innerShade = 0.6,
  innerColor = '#000000',
  cornerRadius = 12,
  thickness = 0,
  initialIndex = 0,
  label = '카드 회전목마',
  describedBy,
  cardLabel,
  onChange,
  onCardClick,
  onDragStart,
  className = '',
  style,
}, ref) {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const cardW = Math.max(40, cardWidth)
  const depth = Math.max(0, thickness)
  const cardH = cardW * contentHeight / contentWidth
  const contentScale = cardW / contentWidth
  const step = 360 / count
  const curveValue = clamp(curve, 0, 1)

  // 원의 반지름: 카드 폭 + 간격을 둘레에 이어 붙인 길이(curve 1)와 평평한 다각형(curve 0) 사이
  const radius = useMemo(() => {
    const n = Math.max(count, 3)
    const pitch = cardW + gap
    const chord = pitch / (2 * Math.sin(Math.PI / n))
    const arc = (n * pitch) / (2 * Math.PI)
    return Math.max(chord + (arc - chord) * curveValue, cardW * 0.6)
  }, [count, cardW, gap, curveValue])

  // 카드를 세로 띠로 나눠 원기둥 면을 따라 조금씩 돌려 세웁니다(카드가 휘어 보이게).
  const tiles = useMemo(() => {
    const total = curveValue > 0.001 ? TILES : 1
    const length = cardW / total
    const bend = curveValue > 0.001 ? radius / curveValue : 0
    return Array.from({ length: total }, (_, index) => {
      const start = index * length - (index > 0 ? OVERLAP / 2 : 0)
      const end = (index + 1) * length + (index < total - 1 ? OVERLAP / 2 : 0)
      const center = (start + end) / 2 - cardW / 2
      const alpha = bend ? center / bend : 0
      const shift = bend ? bend * Math.sin(alpha) : center
      const depth = bend ? -bend * (1 - Math.cos(alpha)) : 0
      const turn = (alpha * 180) / Math.PI
      return { index, total, start, end, size: end - start, move: `translate3d(${shift}px, 0px, ${depth}px) rotateY(${turn}deg)` }
    })
  }, [cardW, curveValue, radius])

  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const wakeRef = useRef<() => void>(() => {})
  const activeRef = useRef(initialIndex)
  const [active, setActive] = useState(initialIndex)
  const [dragging, setDragging] = useState(false)

  const stateRef = useRef({
    angle: -initialIndex * step,
    velocity: 0,
    target: null as number | null,
    dir: 0,
    press: null as Press | null,
    drag: false,
    hover: false,
    pointer: { inside: false, x: 0, y: 0 },
    yaw: 0,
    pitch: 0,
    intro: null as { start: number } | null,
    introDone: false,
    holdUntil: 0,
    stepAt: 0,
    suppressClick: false,
    last: 0,
  })

  const settings = {
    count, step, radius, tilt, perspective, cardH,
    intro: reduced ? 'none' : intro,
    autoplay: reduced ? 'off' : autoplay,
    interval: Math.max(0.5, interval),
    momentum: clamp(momentum, 0, 1),
    snap, pauseOnHover,
    parallax: reduced ? 0 : clamp(parallax, 0, 1),
    stretch: reduced ? 0 : clamp(stretch, 0, 1),
    depthFade: clamp(depthFade, 0, 1),
  }
  const settingsRef = useRef(settings)
  const onChangeRef = useRef(onChange)
  const onDragStartRef = useRef(onDragStart)
  useEffect(() => { onDragStartRef.current = onDragStart }, [onDragStart])
  useEffect(() => {
    settingsRef.current = settings
    onChangeRef.current = onChange
  })

  const directionSign = direction === 'right' ? 1 : -1
  useEffect(() => {
    stateRef.current.dir = directionSign
    wakeRef.current()
  }, [directionSign])

  useLayoutEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const camera = cameraRef.current
    const ring = ringRef.current
    if (!root || !stage || !camera || !ring) return undefined
    const state = stateRef.current
    let raf = 0
    let visible = false

    const nearest = (angle: number) => Math.round(angle / settingsRef.current.step) * settingsRef.current.step

    // 처음 보일 때: 카드가 무대 바닥 아래에서 차례로 올라옵니다(원본 intro 'rise').
    const rise = (elapsed: number, landing: number, drop: number) => {
      if (!state.intro) return 0
      const reach = Math.abs(wrap(landing + state.angle))
      const delay = (reach / 180) * 480
      const p = easeOutQuint(clamp((elapsed - delay) / 900, 0, 1))
      return (1 - p) * drop
    }

    const advance = (s: typeof settings, dt: number, now: number) => {
      if (!state.introDone) {
        if (!state.intro) {
          if (s.intro === 'none') state.introDone = true
          else state.intro = { start: now }
        }
        if (state.intro && now - state.intro.start >= RISE_LENGTH) {
          state.intro = null
          state.introDone = true
        }
      }

      const paused = (s.pauseOnHover && state.hover) || state.drag || now < state.holdUntil
      let busy = Boolean(state.intro) || state.drag

      if (state.drag || state.intro) {
        state.velocity = state.drag ? state.velocity : 0
      } else if (state.target !== null) {
        let remaining = dt
        const damping = 2 * Math.sqrt(SPRING)
        while (remaining > 0) {
          const h = Math.min(remaining, 1 / 240)
          const accel = SPRING * (state.target - state.angle) - damping * state.velocity
          state.velocity += accel * h
          state.angle += state.velocity * h
          remaining -= h
        }
        if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
          state.angle = state.target
          state.velocity = 0
          state.target = null
        }
        busy = true
      } else {
        const tau = 0.18 + s.momentum * 1.5
        state.velocity += (0 - state.velocity) * (1 - Math.exp(-dt / tau))
        state.angle += state.velocity * dt
        if (s.snap && Math.abs(state.velocity) < SETTLE_SPEED) state.target = nearest(state.angle)
        busy = busy || Math.abs(state.velocity) > 0.01 || state.target !== null
      }

      if (s.autoplay === 'step' && !paused && !state.intro && state.introDone) {
        if (!state.stepAt) state.stepAt = now + s.interval * 1000
        if (now >= state.stepAt) {
          state.target = (state.target ?? nearest(state.angle)) + s.step * state.dir
          state.stepAt = now + s.interval * 1000
        }
        busy = true
      } else {
        state.stepAt = 0
      }

      if (now < state.holdUntil) busy = true

      const ease = 1 - Math.exp(-dt / 0.35)
      const aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0
      const aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0
      state.yaw += (aimYaw - state.yaw) * ease
      state.pitch += (aimPitch - state.pitch) * ease
      if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true

      return busy
    }

    const render = (s: typeof settings, now: number) => {
      const elapsed = state.intro ? now - state.intro.start : 0
      const swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420)
      const R = s.radius * swell
      const drop = s.cardH * 1.04
      stage.style.perspective = `${s.perspective}px`
      camera.style.transform = `translate3d(0, 0, ${-R}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`
      ring.style.transform = `rotateY(${state.angle}deg)`

      for (let index = 0; index < s.count; index++) {
        const card = cardRefs.current[index]
        if (!card) continue
        const base = index * s.step
        const lift = rise(elapsed, base, drop)
        // 카드 크기(--cc-scale): 기본 1, 쓰는 쪽 CSS에서 마우스를 올렸을 때 등으로 키울 수 있습니다.
        card.style.transform = `rotateY(${base}deg) translateZ(${R}px) scale(var(--cc-scale, 1))`
        const liftValue = `${lift.toFixed(2)}px`
        if (card.style.getPropertyValue('--cc-lift') !== liftValue) card.style.setProperty('--cc-lift', liftValue)
        // 두께 면은 카드 얼굴이 다 올라온 만큼만 보이게(0 = 숨음, 1 = 다 올라옴) — 올라오기 전에 테두리만 떠 보이지 않게.
        const shownValue = (1 - Math.min(1, lift / drop)).toFixed(3)
        if (card.style.getPropertyValue('--cc-shown') !== shownValue) card.style.setProperty('--cc-shown', shownValue)
        const facing = Math.cos(wrap(base + state.angle) * TO_RAD)
        const fade = s.depthFade * Math.pow((1 - facing) / 2, 1.25)
        const depthValue = fade.toFixed(3)
        if (card.style.getPropertyValue('--cc-depth') !== depthValue) card.style.setProperty('--cc-depth', depthValue)
      }

      const index = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count || 0
      if (index !== activeRef.current) {
        activeRef.current = index
        setActive(index)
        onChangeRef.current?.(index)
      }
    }

    const frame = (now: number) => {
      raf = 0
      const s = settingsRef.current
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60
      state.last = now
      const busy = advance(s, dt, now)
      render(s, now)
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame)
      else state.last = 0
    }

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    wakeRef.current = wake

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
        state.last = 0
      } else wake()
    }

    // 화면에 들어왔을 때만 움직입니다(처음 들어왔을 때 올라오는 효과도 이때 시작).
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) wake()
      else {
        cancelAnimationFrame(raf)
        raf = 0
        state.last = 0
      }
    }, { threshold: 0.25 })
    io.observe(root)
    document.addEventListener('visibilitychange', onVisibility)

    // 올라오기 전에는 카드 틀 아래로 숨겨 둡니다.
    if (settingsRef.current.intro !== 'none') {
      for (let index = 0; index < settingsRef.current.count; index++) {
        const card = cardRefs.current[index]
        if (!card) continue
        card.style.transform = `rotateY(${index * settingsRef.current.step}deg) translateZ(${settingsRef.current.radius}px) scale(var(--cc-scale, 1))`
        card.style.setProperty('--cc-lift', `${(settingsRef.current.cardH * 1.04).toFixed(2)}px`)
        card.style.setProperty('--cc-shown', '0')
      }
      camera.style.transform = `translate3d(0, 0, ${-settingsRef.current.radius}px) rotateX(${settingsRef.current.tilt}deg)`
      ring.style.transform = `rotateY(${state.angle}deg)`
      stage.style.perspective = `${settingsRef.current.perspective}px`
    } else {
      render(settingsRef.current, performance.now())
    }

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => { wakeRef.current() })

  const focusIndex = (index: number) => {
    const state = stateRef.current
    const s = settingsRef.current
    let target = -index * s.step
    target += 360 * Math.round((state.angle - target) / 360)
    state.target = target
    state.holdUntil = performance.now() + 2800
    wakeRef.current()
  }

  const stepBy = (delta: number) => {
    const state = stateRef.current
    const s = settingsRef.current
    const base = state.target ?? Math.round(state.angle / s.step) * s.step
    state.target = base - delta * s.step
    state.holdUntil = performance.now() + 2800
    wakeRef.current()
  }

  useImperativeHandle(ref, () => ({ focus: focusIndex, step: stepBy }))

  const updatePointer = (event: PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    const pointer = stateRef.current.pointer
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1)
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current
    state.suppressClick = false
    if (!draggable || event.button !== 0) return
    state.press = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: state.angle, moved: false, origin: 0, samples: [{ time: performance.now(), angle: state.angle }] }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current
    if (event.pointerType === 'mouse') {
      state.pointer.inside = true
      updatePointer(event)
    }
    const press = state.press
    if (!press || press.id !== event.pointerId) {
      wakeRef.current()
      return
    }
    const s = settingsRef.current
    const delta = event.clientX - press.x
    const cross = event.clientY - press.y
    if (!press.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return
      if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== 'mouse') {
        state.press = null
        return
      }
      press.moved = true
      press.origin = delta
      state.drag = true
      state.target = null
      state.velocity = 0
      setDragging(true)
      onDragStartRef.current?.()
      try { rootRef.current?.setPointerCapture(event.pointerId) } catch { /* 이미 놓았으면 무시 */ }
    }
    // 끈 거리를 화면에 보이는 크기(부모 캔버스가 줄인 비율 포함) 기준으로 각도로 바꿉니다.
    const rect = rootRef.current?.getBoundingClientRect()
    const shown = rect && rootRef.current ? rect.width / rootRef.current.offsetWidth : 1
    const perPixel = 180 / (Math.PI * s.radius * (shown || 1))
    state.angle = press.angle + (delta - press.origin) * perPixel
    const now = performance.now()
    press.samples.push({ time: now, angle: state.angle })
    while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift()
    wakeRef.current()
  }

  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current
    const press = state.press
    if (!press || press.id !== event.pointerId) return
    state.press = null
    if (!press.moved) return
    state.drag = false
    setDragging(false)
    state.suppressClick = true
    const s = settingsRef.current
    const first = press.samples[0]
    const last = press.samples[press.samples.length - 1]
    const span = (last.time - first.time) / 1000
    const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0
    state.velocity = velocity
    if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity)
    if (s.snap) {
      const tau = 0.18 + s.momentum * 1.5
      state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step
    }
    wakeRef.current()
  }

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    stateRef.current.hover = true
    wakeRef.current()
  }

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current
    if (event.pointerType === 'mouse') {
      state.hover = false
      state.pointer.inside = false
    }
    wakeRef.current()
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const state = stateRef.current
    if (state.suppressClick) {
      state.suppressClick = false
      return
    }
    const card = (event.target as HTMLElement).closest?.('[data-cc-index]')
    if (!card) return
    const index = Number(card.getAttribute('data-cc-index'))
    const wasActive = index === activeRef.current
    if (!wasActive) focusIndex(index)
    onCardClick?.(index, wasActive)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') stepBy(1)
    else if (event.key === 'ArrowLeft') stepBy(-1)
    else if (event.key === 'Enter' || event.key === ' ') onCardClick?.(activeRef.current, true)
    else return
    event.preventDefault()
  }

  const renderTile = (index: number, tile: (typeof tiles)[number], back: boolean) => {
    const strip = back ? tile.total - 1 - tile.index : tile.index
    const first = strip === 0
    const last = strip === tile.total - 1
    const r = 'var(--cc-radius)'
    const frameRadius = `${first ? r : 0} ${last ? r : 0} ${last ? r : 0} ${first ? r : 0}`
    const offset = back ? cardW - tile.end : tile.start
    return (
      <div
        key={`${back ? 'b' : 'f'}${tile.index}`}
        className="circular-carousel__tile"
        style={{ left: -tile.size / 2, top: -cardH / 2, width: tile.size, height: cardH, transform: tile.move + (back ? ` translateZ(${-depth}px) rotateY(180deg)` : '') }}
        aria-hidden="true"
      >
        <div className="circular-carousel__frame" style={{ height: cardH, borderRadius: frameRadius }}>
          <div className="circular-carousel__lift">
            <div className="circular-carousel__content" style={{ left: -offset, width: contentWidth, height: contentHeight, transform: `scale(${contentScale})` }}>
              {back ? renderBack?.(index) : renderCard(index)}
            </div>
            {back && <div className="circular-carousel__inner" />}
            <div className="circular-carousel__shade" />
          </div>
        </div>
      </div>
    )
  }

  // 카드 두께: 앞면 띠마다 위·아래 테두리 면, 카드 양 끝에 옆 테두리 면을 붙입니다(앞면에서 안쪽으로 depth만큼).
  // 둥근 모서리 자리(cornerRadius)는 비워 두어 테두리 면이 모서리 밖으로 삐져나오지 않게 합니다.
  const corner = Math.max(0, Math.min(cornerRadius, cardH / 2))
  const renderEdges = () => {
    if (depth <= 0) return null
    const firstTile = tiles[0]
    const lastTile = tiles[tiles.length - 1]
    const rims = tiles.flatMap(tile => {
      const inLeft = tile.index === 0 ? corner : 0
      const inRight = tile.index === tile.total - 1 ? corner : 0
      const width = Math.max(0, tile.size - inLeft - inRight)
      const shift = (inLeft - inRight) / 2
      return (['top', 'bottom'] as const).map(side => (
        <div
          key={`${side}${tile.index}`}
          className={`circular-carousel__edge circular-carousel__edge--${side}`}
          style={{
            left: -width / 2, top: -depth / 2, width, height: depth,
            transform: `${tile.move} translate3d(${shift}px, ${side === 'top' ? -cardH / 2 : cardH / 2}px, ${-depth / 2}px) rotateX(90deg)`,
          }}
          aria-hidden="true"
        />
      ))
    })
    const sideHeight = Math.max(0, cardH - corner * 2)
    const sides = ([['left', firstTile, -1], ['right', lastTile, 1]] as const).map(([side, tile, sign]) => (
      <div
        key={side}
        className={`circular-carousel__edge circular-carousel__edge--side`}
        style={{
          left: -depth / 2, top: -sideHeight / 2, width: depth, height: sideHeight,
          transform: `${tile.move} translate3d(${sign * tile.size / 2}px, 0px, ${-depth / 2}px) rotateY(${sign * 90}deg)`,
        }}
        aria-hidden="true"
      />
    ))
    return [...rims, ...sides]
  }

  return (
    <div
      ref={rootRef}
      className={`circular-carousel ${className}`.trim()}
      style={{
        ...style,
        '--cc-fade': fadeColor,
        '--cc-radius': `${Math.max(0, cornerRadius)}px`,
        '--cc-inner': (1 - clamp(innerShade, 0, 1)).toFixed(3),
        '--cc-inner-color': innerColor,
      } as CSSProperties}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={0}
      data-dragging={dragging || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={event => event.preventDefault()}
    >
      <div ref={stageRef} className="circular-carousel__stage">
        <div ref={cameraRef} className="circular-carousel__camera">
          <div ref={ringRef} className="circular-carousel__ring">
            {Array.from({ length: count }, (_, index) => (
              <div
                key={index}
                ref={element => { cardRefs.current[index] = element }}
                className="circular-carousel__card"
                data-cc-index={index}
                data-active={index === active || undefined}
                role="group"
                aria-roledescription="slide"
                aria-label={cardLabel ? cardLabel(index, index === active) : `${index + 1} / ${count}`}
              >
                {tiles.map(tile => renderTile(index, tile, false))}
                {tiles.map(tile => renderTile(index, tile, true))}
                {renderEdges()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

export default CircularCarousel
