import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { projects } from '../portfolio'
import type { Project } from '../portfolio'
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

function cyclicDistance(index: number, active: number) {
  let distance = index - active
  if (distance > 1) distance -= stageItems.length
  if (distance < -1) distance += stageItems.length
  return distance
}

export default function StageWorks({ onSelect }: { onSelect: (project: Project) => void }) {
  const [active, setActive] = useState(1)
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1920 : window.innerWidth)
  const dragged = useRef(false)

  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const compact = viewportWidth <= 700
  const scale = compact ? Math.max(.52, viewportWidth / 1200) : viewportWidth / 1920
  const anchor = compact ? 1266.5 : 960
  const next = () => setActive(current => (current + 1) % stageItems.length)
  const previous = () => setActive(current => (current - 1 + stageItems.length) % stageItems.length)

  function finishDrag(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < -55 || info.velocity.x < -300) next()
    else if (info.offset.x > 55 || info.velocity.x > 300) previous()
    window.setTimeout(() => { dragged.current = false }, 0)
  }

  const canvasStyle = {
    '--stage-scale': scale,
    '--stage-anchor': `${anchor}px`,
  } as CSSProperties

  return (
    <section id="lineup" className="stage-works" aria-labelledby="lineup-title" style={{ height: compact ? Math.max(640, 1206 * scale) : 1206 * scale }}>
      <div className="stage-works__canvas" style={canvasStyle}>
        <img className="stage-works__asset stage-works__air" src={airGlow} width={1554} height={1000} alt="" />
        <img className="stage-works__asset stage-works__spotlight" src={spotlight} width={876} height={728} alt="" />
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
          <ol>
            {stageItems.map((item, index) => (
              <li key={item.key} data-active={index === active || undefined}>
                <button type="button" onClick={() => setActive(index)} aria-current={index === active ? 'true' : undefined}>
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
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); previous() }
            if (event.key === 'ArrowRight') { event.preventDefault(); next() }
          }}
        >
          <p className="sr-only" id="stage-carousel-help">마우스나 손가락으로 좌우로 끌거나, 방향키로 다음 작품을 볼 수 있습니다.</p>
          <motion.div
            className="stage-carousel__drag"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.28}
            dragMomentum={false}
            onDrag={(_, info) => { if (Math.abs(info.offset.x) > 7) dragged.current = true }}
            onDragEnd={finishDrag}
            aria-describedby="stage-carousel-help"
          >
            {stageItems.map((item, index) => {
              const distance = cyclicDistance(index, active)
              const isActive = distance === 0
              return (
                <motion.button
                  type="button"
                  key={item.key}
                  className={`stage-card${item.key === 'future' ? ' stage-card--future' : ''}`}
                  animate={{ x: distance * 330, y: isActive ? 0 : 70.2, scale: isActive ? 1 : .5, opacity: isActive ? 1 : .62 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28, mass: .75 }}
                  style={{ zIndex: isActive ? 3 : 2 }}
                  aria-label={isActive ? `${item.label} ${item.project ? '프로젝트 자세히 보기' : '준비 중'}` : `${item.label} 카드로 이동`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={event => {
                    if (dragged.current) { event.preventDefault(); return }
                    if (!isActive) setActive(index)
                    else if (item.project) onSelect(item.project)
                  }}
                >
                  <StageCard item={item} />
                </motion.button>
              )
            })}
          </motion.div>
        </div>

        <img className="stage-works__asset stage-works__footlights" src={footlights} width={1000} height={76} alt="" />
        <p className="stage-works__drag-hint" aria-hidden="true">DRAG ↔</p>
        <p className="sr-only" aria-live="polite">현재 작품: {stageItems[active].label}, {stageItems[active].orderStatus}</p>
      </div>
    </section>
  )
}
