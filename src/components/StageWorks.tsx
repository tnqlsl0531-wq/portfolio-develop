import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import CircularCarousel from './CircularCarousel'
import LightRays from './LightRays'
import { useLineProximity } from '../hooks/useLineProximity'
import type { CircularCarouselHandle } from './CircularCarousel'
import { projects } from '../portfolio'
import type { Project } from '../portfolio'
import kooksoondangLogo from '../assets/design/kooksoondang-logo.svg'
import kooksoondangDot from '../assets/design/kooksoondang-dot.svg'
import jaduLogo from '../assets/design/jadu-logo.svg'
import futurePreview from '../assets/stage/future-preview.png'
import airGlow from '../assets/stage/air-glow.svg'
import floorShadow from '../assets/stage/floor-shadow.svg'
import stageSide from '../assets/stage/stage-side.svg'
import stageFolds from '../assets/stage/stage-folds.svg'
import stageTop from '../assets/stage/stage-top.svg'
import stageBoards from '../assets/stage/stage-boards.svg'
import stageRim from '../assets/stage/stage-rim.svg'
import lightPool from '../assets/stage/light-pool.svg'
import cardShadow from '../assets/stage/card-shadow.svg'
import footlights from '../assets/stage/footlights.svg'
import './StageWorks.css'

// 무대 조명이 모이는 자리. .stage-works__rays 영역 안의 비율(가로 가운데, 위에서 6% 지점)입니다.
// 화면 맨 위 바깥이 아니라 카드 위 공중에서 빛이 시작되도록 영역 안쪽 값을 씁니다.
const RAYS_ORIGIN = { x: .5, y: .06 }

// 아직 무대에 오르지 않은 작품(어린이대공원)을 눌렀을 때 뜨는 안내입니다.
const REHEARSAL_NOTICE = '현재 리허설 중이에요. 곧 무대에서 만나요!'

type StageItem = {
  key: 'jadu' | 'kooksoondang' | 'future'
  /** 공연 순서 목록·안내에 쓰는 이름(피그마 346-295) */
  label: string
  orderStatus: string
  badge: string
  project?: Project
}

const jadu = projects.find(project => project.id === 'jadu')!
const kooksoondang = projects.find(project => project.id === 'kooksoondang')!
const stageItems: StageItem[] = [
  { key: 'jadu', label: '안녕자두야', orderStatus: '쇼 종료', badge: '쇼 종료', project: jadu },
  { key: 'kooksoondang', label: '국순당', orderStatus: '메인 공연', badge: '쇼 종료', project: kooksoondang },
  { key: 'future', label: '어린이대공원', orderStatus: '리허설 중', badge: '리허설 중' },
]

/*
 * 둥근 회전목마 값(React Bits Circular Carousel 설정 그대로 + 무대에 맞춘 크기)
 * - 카드 원본 크기는 피그마 카드(706.8 × 255.6) 그대로 그리고, 원 둘레에서는 CARD_WIDTH 폭으로 줄여 보여 줍니다.
 * - 작품 3개를 두 바퀴(6칸) 이어 붙여 원을 만듭니다. 3칸이면 원이 아니라 삼각기둥처럼 딱딱해 보여서요.
 * - CARD_WIDTH 540 + 간격 24 → 원 반지름 약 539px = 무대 반지름(1079 / 2)과 같게 맞췄습니다.
 */
const CARD_CONTENT_WIDTH = 706.8
const CARD_CONTENT_HEIGHT = 255.6
const CARD_WIDTH = 540
const CARD_GAP = 24
const CARD_RADIUS = 8
const SLOTS = stageItems.length * 2
const START_SLOT = 1
const contentRadius = CARD_RADIUS * CARD_CONTENT_WIDTH / CARD_WIDTH
const itemAt = (slot: number) => stageItems[slot % stageItems.length]
const slotDistance = (a: number, b: number) => {
  const gap = Math.abs(a - b) % SLOTS
  return Math.min(gap, SLOTS - gap)
}

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

export default function StageWorks({ onSelect }: { onSelect: (project: Project) => void }) {
  const [active, setActive] = useState(START_SLOT % stageItems.length)
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1920 : window.innerWidth)
  const carousel = useRef<CircularCarouselHandle>(null)
  const activeSlot = useRef(START_SLOT)
  const [notice, setNotice] = useState('')
  const orderList = useLineProximity<HTMLOListElement>(75)

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

  // 공연 순서에서 고른 작품: 같은 작품이 두 칸에 있으니 지금 자리에서 더 가까운 칸으로 돌립니다.
  function select(index: number) {
    const current = activeSlot.current
    const slot = [index, index + stageItems.length].reduce((best, next) =>
      slotDistance(next, current) < slotDistance(best, current) ? next : best)
    carousel.current?.focus(slot)
  }

  const cardStyle = { borderRadius: contentRadius } as CSSProperties

  const canvasStyle = {
    '--stage-scale': scale,
    '--stage-anchor': `${anchor}px`,
  } as CSSProperties

  return (
    <section id="lineup" className="stage-works" aria-labelledby="lineup-title" style={{ height: compact ? Math.max(640, 1206 * scale) : 1206 * scale }}>
      <div className="stage-works__canvas" style={canvasStyle}>
        <img className="stage-works__asset stage-works__air" src={airGlow} width={1554} height={1000} alt="" />
        {/* 무대 조명. 예전의 분홍 빛기둥(spotlight.svg)을 걷어내고 이 빛만 씁니다.
            originPoint = 빛이 모이는 자리(이 영역 안의 가로·세로 비율). 카드 위 공중에서 시작해 아래로 퍼집니다.
            색은 raysColor, 진하기는 intensity, 퍼지는 너비는 lightSpread로 조절합니다. */}
        <LightRays
          className="stage-works__rays"
          originPoint={RAYS_ORIGIN}
          raysColor="#ffd27a"
          raysSpeed={.1}
          lightSpread={.42}
          rayLength={.95}
          saturation={.8}
          intensity={2.6}
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
                  <span className="stage-works__label">
                    <span className="stage-works__dot" aria-hidden="true" />
                    <span className="stage-works__number">0{index + 1}</span>
                    <strong title={item.label}>{item.label}</strong>
                  </span>
                  <span className="stage-works__status">{item.orderStatus}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p className="sr-only" id="stage-carousel-help">좌우로 끌거나 방향키로 돌려 볼 수 있어요. 가운데 카드를 누르거나 Enter 키를 누르면 작품을 자세히 볼 수 있어요.</p>
        <CircularCarousel
          ref={carousel}
          className="stage-works__carousel"
          label="프로젝트 카드"
          describedBy="stage-carousel-help"
          count={SLOTS}
          initialIndex={START_SLOT}
          contentWidth={CARD_CONTENT_WIDTH}
          contentHeight={CARD_CONTENT_HEIGHT}
          cardWidth={CARD_WIDTH}
          gap={CARD_GAP}
          tilt={-4}
          autoplay="step"
          interval={6.5}
          direction="right"
          momentum={.56}
          parallax={.35}
          stretch={.58}
          depthFade={.56}
          fadeColor="#fafafa"
          cornerRadius={CARD_RADIUS}
          innerShade={.5}
          innerColor="#6b3b36"
          cardLabel={(slot, isActive) => {
            const item = itemAt(slot)
            if (!isActive) return `${item.label} 카드`
            return `${item.label} 카드, ${item.project ? '누르면 자세히 보기' : '준비 중'}`
          }}
          onChange={slot => {
            activeSlot.current = slot
            setActive(slot % stageItems.length)
          }}
          onCardClick={(slot, wasActive) => {
            const project = itemAt(slot).project
            if (!wasActive) return
            if (project) onSelect(project)
            // 프로젝트도 기획서도 아직 없는 작품은 안내 문구를 띄웁니다.
            else setNotice(REHEARSAL_NOTICE)
          }}
          renderCard={slot => {
            const item = itemAt(slot)
            return (
              <div className={`stage-card${item.key === 'future' ? ' stage-card--future' : ''}`} style={cardStyle}>
                <StageCard item={item} />
              </div>
            )
          }}
          // 어린이대공원 카드: '리허설 중' 스티커를 카드 틀 밖(오른쪽 위 모서리)에 따로 붙입니다.
          renderSticker={slot => {
            const item = itemAt(slot)
            return item.project ? null : <span className="stage-card__sticker">{item.badge}</span>
          }}
          renderBack={slot => (
            <div className={`stage-card stage-card--back${itemAt(slot).key === 'future' ? ' stage-card--future' : ''}`} style={cardStyle} />
          )}
        />

        <p className="stage-works__notice" data-visible={notice ? 'true' : 'false'} aria-hidden="true"><span>{notice || REHEARSAL_NOTICE}</span></p>
        <img className="stage-works__asset stage-works__footlights" src={footlights} width={1000} height={76} alt="" />
        <p className="sr-only" aria-live="polite">현재 작품: {stageItems[active].label}, {stageItems[active].orderStatus}</p>
        <p className="sr-only" aria-live="polite">{notice}</p>
      </div>
    </section>
  )
}
