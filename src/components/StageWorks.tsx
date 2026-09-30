import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { FACE_WIDTH, FACE_HEIGHT, FACE_STEP, PRISM_RADIUS, REST_YAW, faceAngle, activeFace, nearestFaceAngle, snapAngle } from './stagePrismGeometry'
import { projects } from '../portfolio'
import type { Project } from '../portfolio'
import { useLineProximity } from '../hooks/useLineProximity'
import LightRays from './LightRays'
import kooksoondangLogo from '../assets/design/kooksoondang-logo.svg'
import kooksoondangDot from '../assets/design/kooksoondang-dot.svg'
import jaduLogo from '../assets/design/jadu-logo.svg'
import futurePreview from '../assets/stage/future-preview.png'
import airGlow from '../assets/stage/air-glow.svg'
import spotlight from '../assets/stage/spotlight.svg'
import floorShadow from '../assets/stage/floor-shadow.svg'
import stageSide from '../assets/stage/stage-side.svg'
import stageFolds from '../assets/stage/stage-folds.svg'
import stageTop from '../assets/stage/stage-top.svg'
import stageBoards from '../assets/stage/stage-boards.svg'
import stageRim from '../assets/stage/stage-rim.svg'
import lightPool from '../assets/stage/light-pool.svg'
import cardShadow from '../assets/stage/card-shadow.svg'
import sideShadowLeft from '../assets/stage/side-shadow-left.svg'
import sideShadowRight from '../assets/stage/side-shadow-right.svg'
import footlights from '../assets/stage/footlights.svg'
import './StageWorks.css'

// 아직 무대에 오르지 않은 작품(어린이대공원)을 눌렀을 때 뜨는 안내입니다.
const REHEARSAL_NOTICE = '현재 리허설 중이에요. 곧 무대에서 만나요!'

type StageItem = {
  key: 'jadu' | 'kooksoondang' | 'future'
  label: string
  orderStatus: string
  badge: string
  project?: Project
}

const jadu = projects.find(project => project.id === 'jadu')!
const kooksoondang = projects.find(project => project.id === 'kooksoondang')!
const stageItems: StageItem[] = [
  { key: 'jadu', label: '자두야', orderStatus: '쇼 종료', badge: '쇼 종료', project: jadu },
  { key: 'kooksoondang', label: '국순당', orderStatus: '메인 공연', badge: '쇼 종료', project: kooksoondang },
  { key: 'future', label: '어대공', orderStatus: '리허설 중', badge: '쇼 예정' },
]

function StageArtwork({ item }: { item: StageItem }) {
  if (item.key === 'future') {
    return <div className="stage-card__art stage-card__art--future"><img src={futurePreview} width={318} height={208} alt="" /></div>
  }
  return (
    <div className={`stage-card__art stage-card__art--${item.key}`}>
      {item.key === 'kooksoondang' ? <>
        <div className="stage-card__kooksoondang"><img src={kooksoondangLogo} alt="국순당" /></div>
        <img className="stage-card__dot" src={kooksoondangDot} alt="" />
      </> : <img className="stage-card__jadu" src={jaduLogo} alt="자두야" />}
      <span className="stage-card__badge">{item.badge}</span>
    </div>
  )
}

function StageCard({ item }: { item: StageItem }) {
  if (!item.project) {
    return <div className="stage-card__inner stage-card__inner--future"><StageArtwork item={item} /><p>COMING<br />SOON</p></div>
  }
  return (
    <div className="stage-card__inner">
      <StageArtwork item={item} />
      <div className="stage-card__info">
        <div className="stage-card__details">
          <h3>{item.project.title}</h3>
          <dl>
            <div><dt>기관:</dt><dd>{item.project.organization}</dd></div>
            <div><dt>유형:</dt><dd>{item.project.team === 'Team' ? '팀프로젝트' : '개인프로젝트'}</dd></div>
          </dl>
        </div>
        <p className="stage-card__period">{item.project.period}</p>
      </div>
    </div>
  )
}

function PrismFace({ item, index, active, rotation, onActivate }: {
  item: StageItem
  index: number
  active: number
  rotation: MotionValue<number>
  onActivate: () => void
}) {
  const shading = useTransform(rotation, angle => {
    const light = Math.max(0, Math.cos((angle + faceAngle(index)) * Math.PI / 180))
    return .24 * (1 - light)
  })
  return (
    <button
      type="button"
      className={`stage-card${item.key === 'future' ? ' stage-card--future' : ''}`}
      style={{ transform: `rotateY(${faceAngle(index)}deg) translateZ(${PRISM_RADIUS}px)` }}
      tabIndex={index === active ? 0 : -1}
      aria-label={index === active ? `${item.label} ${item.project ? '프로젝트 자세히 보기' : '준비 중'}` : `${item.label} 카드로 이동`}
      aria-current={index === active ? 'true' : undefined}
      onClick={onActivate}
    >
      <StageCard item={item} />
      <motion.span className="stage-card__shade" style={{ opacity: shading }} aria-hidden="true" />
    </button>
  )
}

export default function StageWorks({ onSelect }: { onSelect: (project: Project) => void }) {
  const [active, setActive] = useState(1)
  const [notice, setNotice] = useState('')
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1920 : window.innerWidth)
  const dragged = useRef(false)
  const rotation = useMotionValue(REST_YAW)
  const reducedMotion = useReducedMotion()
  const animation = useRef<ReturnType<typeof animate> | null>(null)
  const gesture = useRef<{
    id: number; x: number; y: number; angle: number; lastX: number; time: number; velocity: number; moved: boolean
  } | null>(null)
  const [dragging, setDragging] = useState(false)
  const orderList = useLineProximity<HTMLOListElement>(75)

  useEffect(() => () => animation.current?.stop(), [])

  // 안내 문구는 잠깐 보였다가 사라집니다(백스테이지 안내와 같은 2.6초).
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const compact = viewportWidth <= 700
  const scale = compact ? Math.min(.58, viewportWidth / 950) : viewportWidth / 1920
  const anchor = compact ? 1266.5 : 960
  const degreesPerPixel = FACE_STEP / (FACE_WIDTH * scale * .65)

  function settle(target: number) {
    animation.current?.stop()
    setActive(activeFace(target))
    animation.current = animate(rotation, target, {
      duration: reducedMotion ? 0 : .55,
      ease: [.22, 1, .36, 1],
    })
  }

  function select(index: number) { settle(nearestFaceAngle(index, rotation.get())) }
  function step(direction: number) { settle(snapAngle(rotation.get()) - direction * FACE_STEP) }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return
    animation.current?.stop()
    dragged.current = false
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      angle: rotation.get(), lastX: event.clientX, time: event.timeStamp, velocity: 0, moved: false }
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!start.moved) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null
        settle(snapAngle(rotation.get()))
        return
      }
      if (Math.abs(dx) < 6) return
      start.moved = true
      dragged.current = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const elapsed = event.timeStamp - start.time
    if (elapsed > 0) start.velocity = (event.clientX - start.lastX) / elapsed * 1000
    start.lastX = event.clientX
    start.time = event.timeStamp
    rotation.set(start.angle + dx * degreesPerPixel)
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!start.moved && !cancelled) {
      settle(nearestFaceAngle(active, rotation.get()))
      return
    }
    const velocity = cancelled || event.timeStamp - start.time > 100 ? 0 : start.velocity
    const projection = rotation.get() + Math.max(-900, Math.min(900, velocity)) * degreesPerPixel * .12
    let target = snapAngle(projection)
    const dx = event.clientX - start.x
    if (!cancelled && Math.abs(dx) > 36 && target === snapAngle(start.angle)) {
      target += Math.sign(dx) * FACE_STEP
    }
    settle(target)
  }

  const canvasStyle = {
    '--stage-scale': scale,
    '--stage-anchor': `${anchor}px`,
    '--face-width': `${FACE_WIDTH}px`,
    '--face-height': `${FACE_HEIGHT}px`,
    '--prism-radius': `${PRISM_RADIUS}px`,
  } as CSSProperties

  return (
    <section id="lineup" className="stage-works" aria-labelledby="lineup-title" style={{ height: compact ? Math.max(640, 1206 * scale) : 1206 * scale }}>
      <div className="stage-works__canvas" style={canvasStyle}>
        <img className="stage-works__asset stage-works__air" src={airGlow} width={1554} height={1000} alt="" />
        <img className="stage-works__asset stage-works__spotlight" src={spotlight} width={876} height={728} alt="" />
        {/* 빛기둥(spotlight.svg)과 같은 자리에 겹치는 빛줄기입니다.
            색은 아래 raysColor, 진하기는 StageWorks.css의 .stage-works__rays opacity로 바꿉니다.
            rayLength는 '빛이 닿는 거리 ÷ 영역의 가로 길이'입니다. 리액트비츠 예시(0.5)는 화면 전체처럼 옆으로 넓은 영역 기준이라,
            세로로 긴 우리 빛기둥(876×728)에 그대로 쓰면 위쪽 40%에서 빛이 끊깁니다. 같은 비율로 보이도록 0.8로 환산했습니다. */}
        <LightRays
          className="stage-works__rays"
          raysOrigin="top-center"
          raysColor="#fff0c4"
          raysSpeed={.1}
          lightSpread={.1}
          rayLength={.8}
          saturation={.8}
          mouseInfluence={.2}
        />
        <img className="stage-works__asset stage-works__floor-shadow" src={floorShadow} width={1252} height={132} alt="" />
        <img className="stage-works__asset stage-works__side" src={stageSide} width={1079} height={266} alt="" />
        <img className="stage-works__asset stage-works__folds" src={stageFolds} width={1074} height={254} alt="" />
        <img className="stage-works__asset stage-works__top" src={stageTop} width={1079} height={176} alt="" />
        <img className="stage-works__asset stage-works__boards" src={stageBoards} width={1079} height={176} alt="" />
        <img className="stage-works__asset stage-works__rim" src={stageRim} width={863} height={110} alt="" />
        <img className="stage-works__asset stage-works__pool" src={lightPool} width={730} height={130} alt="" />
        <img className="stage-works__asset stage-works__card-shadow" src={cardShadow} width={685} height={50} alt="" />
        <img className="stage-works__asset stage-works__side-shadow-left" src={sideShadowLeft} width={331} height={24} alt="" />
        <img className="stage-works__asset stage-works__side-shadow-right" src={sideShadowRight} width={331} height={24} alt="" />

        <header className="stage-works__intro">
          <h2 id="lineup-title">Stage Works</h2>
          <p>무대에 올린 작품들</p>
        </header>

        <nav className="stage-works__order" aria-label="오늘의 공연 순서">
          <p>오늘의 공연 순서</p>
          <ol ref={orderList}>
            {stageItems.map((item, index) => (
              <li key={item.key} data-active={index === active || undefined}>
                <button type="button" aria-current={index === active ? 'true' : undefined}
                  onClick={() => {
                    select(index)
                    // 이미 고른 작품을 다시 눌렀는데 볼 것이 없으면 아무 반응이 없어 보이므로 안내를 띄웁니다.
                    if (index === active && !item.project) setNotice(REHEARSAL_NOTICE)
                  }}>
                  <span className="stage-works__dot" aria-hidden="true" />
                  <span className="stage-works__number">0{index + 1}</span>
                  <strong>{item.label}</strong>
                  <span>{item.orderStatus}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div
          className="stage-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="프로젝트 카드"
          aria-describedby="stage-carousel-help"
          tabIndex={0}
          data-dragging={dragging || undefined}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={event => finishDrag(event)}
          onPointerCancel={event => finishDrag(event, true)}
          onLostPointerCapture={event => finishDrag(event, true)}
          onPointerLeave={event => { if (gesture.current && !gesture.current.moved) finishDrag(event, true) }}
          onDragStart={event => event.preventDefault()}
          onClickCapture={event => {
            if (dragged.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation() }
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
            if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
          }}
        >
          <p className="sr-only" id="stage-carousel-help">마우스나 손가락으로 좌우로 끌거나, 방향키로 다음 작품을 볼 수 있습니다.</p>
          <div className="stage-carousel__camera">
            <motion.div className="stage-prism" style={{ rotateY: rotation }}>
              <div className="stage-prism__cap stage-prism__cap--top" aria-hidden="true" />
              <div className="stage-prism__cap stage-prism__cap--bottom" aria-hidden="true" />
              {stageItems.map((item, index) => (
                <PrismFace key={item.key} item={item} index={index} active={active} rotation={rotation}
                  onActivate={() => {
                    if (index !== active) select(index)
                    else if (item.project) onSelect(item.project)
                    // 프로젝트도 기획서도 아직 없는 작품은 안내 문구를 띄웁니다.
                    else setNotice(REHEARSAL_NOTICE)
                  }} />
              ))}
            </motion.div>
          </div>
        </div>

        <p className="stage-works__notice" data-visible={notice ? 'true' : 'false'} aria-hidden="true"><span>{notice || REHEARSAL_NOTICE}</span></p>
        <img className="stage-works__asset stage-works__footlights" src={footlights} width={1000} height={76} alt="" />
        <p className="stage-works__drag-hint" aria-hidden="true">DRAG ↔</p>
        <p className="sr-only" aria-live="polite">현재 작품: {stageItems[active].label}, {stageItems[active].orderStatus}</p>
        <p className="sr-only" aria-live="polite">{notice}</p>
      </div>
    </section>
  )
}
