import OnStageChoice from './components/OnStageChoice'
import BackstageChoice from './components/BackstageChoice'
import EntryTicket, { hasEnteredPortfolio } from './components/EntryTicket'
import StageWorks from './components/StageWorks'
import { Component, Fragment, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { heroPhotos, profile, projects } from './portfolio'
import { galleryTracks } from './galleryPhotos'
import type { PhotoPosition, Project } from './portfolio'
import heroCurve from './assets/design/hero-curve.svg'
import heroCurveColor from './assets/design/hero-curve-color.svg'
import paperclip from './assets/design/paperclip.svg'
import StrokePresenter from './components/StrokePresenter'
import { useColorReveal } from './hooks/useColorReveal'
import GalleryArchive from './components/GalleryArchive'
import ProjectCover from './components/ProjectCover'
import Backstage, { hasBackstage } from './components/Backstage'
import type { ArchiveOrigin } from './components/GalleryArchive'

// 3D 목줄은 용량이 커서 Contact 섹션에 가까워졌을 때만 불러옵니다.
import CurvedLoop from './components/CurvedLoop'
import FoldText from './components/FoldText'
import ScrollFloat from './components/ScrollFloat'
import SplashCursor from './components/SplashCursor'
import { heroCurveEdge } from './heroCurveEdge'
import chevron from './assets/design/chevron.svg'
const Lanyard = lazy(() => import('./components/Lanyard'))
import './App.css'

const photoDescriptions: Record<PhotoPosition, string> = {
  main: '최수빈의 공연 사진 · 한복 의상',
  upper: '최수빈의 공연 사진 · 고글 모자와 멜빵 의상',
  right: '최수빈의 공연 사진 · 빨간 연미복 의상',
}

// 사진 파일의 실제 픽셀 크기(피그마 표시 크기의 2배)
const photoSizes: Record<PhotoPosition, [number, number]> = {
  main: [776, 1254],
  upper: [586, 556],
  right: [582, 922],
}

const GALLERY_GAP = 24
const GALLERY_COLUMN = 2656
const GALLERY_SPEED = 41.2

// 같은 사진을 두 장 겹칩니다. 아래 장은 채도를 90% 뺀 사진, 위 장은 원래 색 사진이며
// 위 장은 커서 주변 원 안에서만 보입니다(가장자리 페이드는 바깥 틀이 두 장에 함께 적용).
// data-reveal: 커서 위치(--mx/--my)를 받는 요소 표시(src/hooks/useColorReveal.ts)
function PhotoSlot({ position }: { position: PhotoPosition }) {
  const src = heroPhotos[position]
  const className = 'hero__photo hero__photo--' + position
  const [width, height] = photoSizes[position]
  return src ? (
    <span className={className} data-reveal="">
      <img className="hero__photo-img" src={src} alt={photoDescriptions[position]} width={width} height={height} decoding="async" />
      <img className="hero__photo-img hero__color-layer" src={src} alt="" aria-hidden="true" width={width} height={height} decoding="async" />
    </span>
  ) : (
    <div className={className + ' hero__photo--empty'} role="img" aria-label={photoDescriptions[position] + ' 자리'} />
  )
}

/* 히어로 색 드러내기 (React Bits Halftone Reveal의 돋보기 느낌만 참고)
   - 마우스를 올리기 전: 사진 채도 90% 제거, 글자·배경은 회색(피그마 122-582)
   - 마우스를 올리면: 커서 주변 원(히어로 높이의 21%, 가장자리 부드러움 0.5) 안에서만
     사진은 원래 색, GRAND·EXHIBITION 글자와 아래 배경은 코랄·와인 색(피그마 263-409),
     히어로 아래 물결(피그마 150-1626)은 히어로 배경이 끝나는 색(#502421)
   - 망점 효과와 화면이 휘는 렌즈 왜곡은 넣지 않았습니다.
   - 마우스가 없는 기기(터치)에서는 처음부터 원래 색으로 보입니다(CSS).
   - 원이 따라오는 속도·나타나는 시간: src/hooks/useColorReveal.ts의 REVEAL_FOLLOW · REVEAL_FADE */
function Hero() {
  const stageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  // 원 크기: 히어로 높이의 21%
  useColorReveal(stageRef, heroRef, 0.21)
  // 히어로가 화면 밖으로 나가면 GRAND EXHIBITION 반짝임을 멈춥니다.
  // 흑백 글자와 컬러 글자가 함께 멈추고 함께 다시 흘러서 박자가 어긋나지 않습니다.
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const observer = new IntersectionObserver(([entry]) => { hero.dataset.onscreen = String(entry.isIntersecting) })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={stageRef} className="hero-stage">
      <section ref={heroRef} className="hero" aria-labelledby="exhibition-title">
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__shade hero__shade--color hero__color-layer" data-reveal="" aria-hidden="true" />
        <PhotoSlot position="right" />
        <h1 id="exhibition-title" className="hero__title">
          <span className="hero__word hero__word--grand">GRAND</span>{' '}
          <span className="hero__word hero__word--grand hero__word--color hero__color-layer" data-reveal="" aria-hidden="true">GRAND</span>
          <span className="hero__word hero__word--exhibition">EXHIBITION</span>
          <span className="hero__word hero__word--exhibition hero__word--color hero__color-layer" data-reveal="" aria-hidden="true">EXHIBITION</span>
        </h1>
        <PhotoSlot position="main" />
        <PhotoSlot position="upper" />
        <StrokePresenter />
      </section>
      {/* 히어로 아래 물결(피그마 150-1626): 기본은 검정, 커서 주변 원 안에서는 히어로 배경이 끝나는 색 */}
      <div className="hero-curve" aria-hidden="true">
        <img className="hero-curve__img" src={heroCurve} alt="" />
        <img className="hero-curve__img hero-curve__color hero__color-layer" src={heroCurveColor} alt="" data-reveal="" />
      </div>
    </div>
  )
}

function ArtistGallery({ onOpen }: { onOpen: (origin: ArchiveOrigin) => void }) {
  const section = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = section.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={section} id="gallery" className="gallery" aria-labelledby="gallery-title" data-active={visible}>
      <div className="gallery__viewport" aria-hidden="true">
        <div className="gallery__tracks-position">
          <div className="gallery__tracks">
            {galleryTracks.map((photos, track) => {
              // 한 벌(사진 + 간격 24) 길이만큼 올라가거나 내려간 뒤 처음으로 돌아가 끊김 없이 반복합니다.
              // 줄 높이(2656)를 늘 채우도록 필요한 만큼 이어 붙이고, 줄마다 같은 속도로 흐르게 시간을 맞춥니다.
              const loop = photos.reduce((sum, photo) => sum + photo.height + GALLERY_GAP, 0)
              const copies = Math.ceil(GALLERY_COLUMN / loop) + 1
              const style = { '--loop': loop, '--duration': `${loop / GALLERY_SPEED}s` } as CSSProperties
              return (
                <div className="gallery__column" key={track}>
                  <div className={`gallery__moving gallery__moving--${track % 2 === 0 ? 'up' : 'down'}`} style={style}>
                    {Array.from({ length: copies }, (_, copy) => (
                      <div className="gallery__sequence" key={copy}>
                        {photos.map((photo, index) => (
                          <div className="gallery__photo" style={{ '--h': photo.height } as CSSProperties} key={index}>
                            <img src={photo.src} alt="" width={192} height={photo.height} loading="lazy" decoding="async" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="gallery__fade gallery__fade--bottom" />
        <div className="gallery__fade gallery__fade--edge" />
        <div className="gallery__fade gallery__fade--top" />
      </div>
      <div className="gallery__intro">
        <div className="gallery__heading">
          {/* 제목이 화면에 들어오면 글자가 한 장씩 접혔다 펴집니다(React Bits Fold Text). 글꼴·크기는 기존 피그마 값 그대로입니다. */}
          <h2 id="gallery-title" className="section-heading gallery__title">
            <FoldText text={'Artist\nGallery'} duration={.45} stagger={.04} perspective={375} creaseShading={.5} />
          </h2>
          <p>아티스트 포토 아카이브전</p>
        </div>
        {/* 누르면 아카이브 화면(피그마 109-8)이 이 버튼 자리에서 원으로 퍼지며 열립니다. */}
        <button
          className="gallery__link"
          onClick={event => {
            const box = event.currentTarget.getBoundingClientRect()
            onOpen({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
          }}
        >
          <span className="gallery__link-label">자세히 보러가기</span>
          {/* 피그마 Vector 1810(node 217-1559) 좌표 그대로. 마우스를 올리면 가로선이 195 → 224로 길어지고 꺾인 끝이 따라갑니다(node 217-1567). */}
          <svg className="gallery__link-arrow" viewBox="0 0 226 23" fill="none" aria-hidden="true" focusable="false">
            <line className="gallery__link-line" x1="1" y1="22" x2="225" y2="22" />
            <path className="gallery__link-tail" d="M196 22L176.5 1" />
          </svg>
        </button>
      </div>
    </section>
  )
}

function DirectorsNote() {
  const portrait = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = portrait.current
    if (!element) return

    // 사진의 실제 높이를 사용해 화면 중앙에서 고정합니다.
    // 부모 그리드가 마지막 문단에서 끝나므로 다음 섹션까지 따라가지 않습니다.
    const measure = () => {
      element.style.setProperty('--portrait-half-height', `${element.getBoundingClientRect().height / 2}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="director" className="director" aria-labelledby="director-title">
      {/* 제목(피그마 351-185): 스크롤하면 글자가 하나씩 아래에서 떠오릅니다(React Bits Scroll Float, stagger 0.02). */}
      <ScrollFloat id="director-title" className="section-heading director__title" text="Director’s Note" />
      <div className="director__body">
        <div ref={portrait} className="director__portrait-sticky">
          {profile.portrait ? (
            <img className="director__portrait" src={profile.portrait} alt={`${profile.name} 프로필 사진`} loading="lazy" decoding="async" />
          ) : <div className="director__portrait director__portrait--empty" role="img" aria-label="최수빈 프로필 사진 자리" />}
        </div>
        <div className="director__content">
          <div className="director__overview">
            <div className="director__identity">
              <p className="director__role">{profile.role}</p>
              <h3>{profile.name}</h3>
              <p className="director__english-name">{profile.englishName}</p>
            </div>
            <div className="director__profile">
              <h3 className="section-heading">Profile</h3>
              <dl>{profile.history.map(item => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}{item.detail && <span className="director__profile-detail">{item.detail}</span>}</dd>
                </div>
              ))}</dl>
            </div>
          </div>
          <div className="director__paragraphs">{profile.paragraphs.map((lines, index) => (
            <p key={index}>{lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && ' '}
                <span className="director__line">
                  {line.split(/(‘관객이 어떻게 느낄까’|‘이 사람의 다른 작업도 보고 싶다’)/u).map((part, partIndex) => (
                    partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part
                  ))}
                </span>
              </Fragment>
            ))}</p>
          ))}</div>
        </div>
      </div>
    </section>
  )
}

function StaffPass() {
  const label = 'GRAND EXHIBITION / CHOI - SUBIN PRESENTS'
  return (
    <div className="staff-pass">
      <div className="staff-pass__hole" aria-hidden="true" />
      <p className="staff-pass__edge">{label}</p>
      <div className="staff-pass__body">
        <p className="staff-pass__staff">STAFF</p>
        <div className="staff-pass__person"><h3>{profile.name}</h3><p>UI·UX Designer</p></div>
        <dl>
          <div><dt>EMAIL</dt><dd><a href={`mailto:${profile.email}`}>{profile.email} <span aria-hidden="true">↗</span></a></dd></div>
          <div><dt>INSTAGRAM</dt><dd className="staff-pass__instagram">{profile.instagramLabel}</dd></div>
        </dl>
      </div>
      <p className="staff-pass__edge" aria-hidden="true">{label}</p>
    </div>
  )
}

// 1줄 배치(폰·터치 태블릿)와 같은 조건. 이때는 3D 대신 그림으로 된 스태프 패스를 보여줍니다.
const singleColumnQuery = '(max-width: 700px), (max-width: 1200px) and (pointer: coarse)'
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function useLanyardEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const layout = window.matchMedia(singleColumnQuery)
    const motion = window.matchMedia(reducedMotionQuery)
    const webgl = supportsWebGL()
    const update = () => setEnabled(webgl && !layout.matches && !motion.matches)
    update()
    layout.addEventListener('change', update)
    motion.addEventListener('change', update)
    return () => {
      layout.removeEventListener('change', update)
      motion.removeEventListener('change', update)
    }
  }, [])
  return enabled
}

class LanyardBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

// 3D 목줄 무대(App.css .contact__lanyard): 화면 왼쪽 끝(0)부터 폭 1300(1920 기준). 목줄 고정점은 스태프 패스 가운데(x 470.667)라서 폭의 470.667/1300 자리.
// 카드가 오른쪽에서 떨어지며 흔들리므로, 떨어지는 동안 카드가 무대 오른쪽 끝에서 잘려 보이지 않도록 폭을 넉넉히 잡았습니다(예전 941.333).
const LANYARD_ANCHOR_LEFT = 470.667 / 1300
// 3D 목줄이 착지를 알리지 못하는 경우(아주 느린 기기 등)를 대비해, 내려오기 시작하고 이만큼(ms) 지나면 착지한 것으로 봅니다.
const LANDING_FALLBACK_MS = 5000

/** onLanded: 목걸이가 다 떨어져 자리를 잡았을 때 알려줍니다(3D 목줄이면 true, 폰 등에서 그림 카드면 false). */
function ContactPass({ onLanded }: { onLanded?: (withLanyard: boolean) => void }) {
  const area = useRef<HTMLDivElement>(null)
  const dropZone = useRef<HTMLDivElement>(null)
  const enabled = useLanyardEnabled()
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  // 목걸이는 카드가 매달릴 자리(.contact__drop-zone)가 화면에 조금이라도 보이면 바로 내려옵니다(그 전에는 멈춘 채 숨어 있음).
  // 섹션이 화면에 얼마나 들어왔는지(비율)는 따지지 않습니다.
  const [dropped, setDropped] = useState(false)
  const show3D = enabled && !failed
  // 그림 카드(폰 등)는 떨어지는 움직임이 없어서, 내려올 때가 되면 바로 알려줍니다.
  useEffect(() => { if (dropped && !show3D) onLanded?.(false) }, [dropped, show3D, onLanded])
  // 3D 목줄은 Lanyard가 착지를 알려줍니다. 혹시 못 알리면 LANDING_FALLBACK_MS 뒤에 알려줍니다.
  useEffect(() => {
    if (!dropped || !show3D) return
    const timer = window.setTimeout(() => onLanded?.(true), LANDING_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [dropped, show3D, onLanded])
  const handleLanded = useCallback(() => onLanded?.(true), [onLanded])

  useEffect(() => {
    const element = area.current
    if (!element) return
    const section = element.closest('section') ?? element
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true) }, { rootMargin: '800px 0px' })
    // 섹션이 화면에 1px이라도 보이면 목걸이 물리 계산을 켭니다 → 화면을 많이 내리거나 올린 상태에서도 목걸이를 끌며 놀 수 있어요.
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    nearObserver.observe(section)
    visibleObserver.observe(section)
    const dropObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setDropped(true)
      dropObserver.disconnect()
    })
    dropObserver.observe(dropZone.current ?? section)
    return () => {
      nearObserver.disconnect()
      visibleObserver.disconnect()
      dropObserver.disconnect()
    }
  }, [])

  return (
    <div ref={area} className="contact__pass-area" data-lanyard={show3D ? '3d' : 'static'}>
      <div ref={dropZone} className="contact__drop-zone" aria-hidden="true" />
      {show3D ? (
        near && (
          <div className="contact__lanyard" aria-hidden="true">
            <LanyardBoundary onError={() => setFailed(true)}>
              <Suspense fallback={null}>
                <Lanyard active={visible && dropped} anchorLeft={LANYARD_ANCHOR_LEFT} onLanded={handleLanded} />
              </Suspense>
            </LanyardBoundary>
          </div>
        )
      ) : (
        <div className="contact__strap" aria-hidden="true">
          <span>CHOI - SUBIN</span>
          <span>CHOI - SUBIN</span>
        </div>
      )}
      <h2 id="contact-title" className="section-heading contact__title">Contact</h2>
      {!show3D && <div className="contact__connector" aria-hidden="true" />}
      {show3D ? (
        <p className="sr-only">스태프 패스: {profile.name}, UI·UX Designer. 이메일 {profile.email}. 인스타그램 {profile.instagramLabel}.</p>
      ) : (
        <StaffPass />
      )}
    </div>
  )
}

// 맨 아래 흐르는 글자 띠(피그마 342-180, React Bits Curved Loop: speed 2.2, curveAmount 0 = 곧은 줄)
// 피그마 수정본대로 검정(#0f0f0f) 바탕에 코랄(#f8574f) 글씨입니다(예전에는 코랄 바탕에 회색 그라데이션 글씨).
// 글자가 48로 작아진 만큼 같은 speed가 두 배로 빨라 보여서, 흐르는 속도도 2.2 → 1.1로 절반으로 낮췄습니다.
// 띠 높이 138 · 글자 48 · 자간 -1.44는 피그마 값이고, 색·크기는 App.css의 .marquee-band에 있습니다.
// 마우스로 끌어서 움직일 수 있고, 끈 방향으로 계속 흐릅니다. 한 벌이 끝나면 ' · '로 이어집니다.
const MARQUEE_TEXT = 'GRAND EXHIBITION · CHOISUBIN DESIGN PORTFOLIO · '

function MarqueeBand() {
  return (
    <section className="marquee-band" aria-label="GRAND EXHIBITION · CHOISUBIN DESIGN PORTFOLIO">
      <CurvedLoop
        marqueeText={MARQUEE_TEXT}
        speed={1.1}
        curveAmount={0}
        width={1920}
        height={138}
        lineY={69}
        className="marquee-band__text"
      />
    </section>
  )
}

// 제안서(문의 폼) 등장: 목걸이가 다 떨어져 자리를 잡으면(Lanyard의 onLanded) afterLanding(ms) 뒤에
// 폼이 땅(아래 글자 띠) 뒤에서 '뿅' 올라옵니다. 목걸이가 떨어지는 동안에는 폼이 보이지 않아 목걸이를 가리지 않습니다.
// 폰처럼 3D 목줄 대신 그림 카드가 나오는 화면은 폼이 화면에 들어오면 afterCard(ms) 뒤에 올라옵니다.
// 착지로 보는 기준은 Lanyard.tsx의 LANDING, 올라오는 거리·튀는 느낌은 App.css의 .contact__form-area(--form-pop-from, transition)에서 조절합니다.
const FORM_POP = { afterLanding: 200, afterCard: 150 }

function Contact() {
  const [draft, setDraft] = useState<{ href: string; text: string } | null>(null)
  const [copyStatus, setCopyStatus] = useState('')
  // 필수 칸(이름·이메일·문의 유형·메시지)이 모두 알맞게 채워졌는지 — 채워지면 '문의 보내기'가 코랄색으로 바뀝니다.
  const [complete, setComplete] = useState(false)

  const formArea = useRef<HTMLDivElement>(null)
  const [landed, setLanded] = useState<{ withLanyard: boolean } | null>(null)
  const [formInView, setFormInView] = useState(false)
  const [formShown, setFormShown] = useState(false)
  const handleLanded = useCallback((withLanyard: boolean) => setLanded(previous => previous ?? { withLanyard }), [])

  // 폼 자리가 화면에 조금이라도 들어왔는지(비율은 따지지 않음. 폰에서는 목걸이 카드 아래에 있어서 따로 봅니다)
  useEffect(() => {
    const element = formArea.current
    if (!element || formInView) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setFormInView(true) })
    observer.observe(element)
    return () => observer.disconnect()
  }, [formInView])

  useEffect(() => {
    if (!landed || !formInView || formShown) return
    const timer = window.setTimeout(() => setFormShown(true), landed.withLanyard ? FORM_POP.afterLanding : FORM_POP.afterCard)
    return () => window.clearTimeout(timer)
  }, [landed, formInView, formShown])

  function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    const text = [`이름: ${value('name')}`, `소속: ${value('organization') || '미입력'}`, `이메일: ${value('email')}`, `문의 유형: ${value('topic')}`, '', value('message')].join('\n')
    const href = `mailto:${profile.email}?subject=${encodeURIComponent(`[${value('topic')}] ${value('name')}님의 문의`)}&body=${encodeURIComponent(text)}`
    setDraft({ href, text })
    setCopyStatus('')
    window.location.href = href
  }

  async function copyDraft() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(draft.text)
      setCopyStatus('문의 내용을 복사했어요. 메일 본문에 붙여넣어주세요.')
    } catch {
      setCopyStatus('자동 복사를 사용할 수 없어요. 아래 내용을 직접 선택해 복사해주세요.')
    }
  }

  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <ContactPass onLanded={handleLanded} />
      {/* 키보드로 폼 칸에 먼저 들어오면 기다리지 않고 바로 보여줍니다. */}
      <div ref={formArea} className="contact__form-area" data-shown={formShown} onFocus={() => setFormShown(true)}>
        <img className="contact__paperclip" src={paperclip} alt="" aria-hidden="true" />
        <form
          className="contact-form"
          data-complete={complete}
          onSubmit={submitInquiry}
          onInput={event => setComplete(event.currentTarget.checkValidity())}
          onChange={event => {
            setComplete(event.currentTarget.checkValidity())
            if (draft) setDraft(null)
          }}
        >
          <div className="contact-form__heading"><h3>GET IN TOUCH</h3><p>함께할 프로젝트나 제안을 남겨주세요.</p></div>
          <div className="contact-form__pair">
            <label>이름 *<input name="name" autoComplete="name" placeholder="이름을 입력해주세요" required maxLength={80} pattern=".*\S.*" /></label>
            <label>소속 (선택)<input name="organization" autoComplete="organization" placeholder="회사 또는 단체명" maxLength={100} /></label>
          </div>
          <label>이메일 *<input name="email" type="email" autoComplete="email" placeholder="답변 받을 이메일 주소" required maxLength={150} /></label>
          <label><span id="contact-topic-label">문의 유형 *</span>
            <span className="contact-form__select">
              <select name="topic" aria-labelledby="contact-topic-label" defaultValue="" required>
                <option value="" disabled>채용 / 디자인 협업 / 공연·콘텐츠 / 기타</option>
                <option>채용</option><option>디자인 협업</option><option>공연·콘텐츠</option><option>기타</option>
              </select>
              <img src={chevron} width={14} height={10} alt="" aria-hidden="true" />
            </span>
          </label>
          <label>메시지 *<textarea name="message" placeholder="제안 내용과 일정을 알려주세요." required maxLength={1200} onInput={event => {
            event.currentTarget.setCustomValidity(event.currentTarget.value.trim() ? '' : '메시지를 입력해주세요.')
          }} /></label>
          <div className="contact-form__submit">
            <button type="submit" aria-describedby="contact-submit-note">문의 보내기 <span aria-hidden="true">↗</span></button>
            <p id="contact-submit-note" className="sr-only">메일 앱에서 내용을 확인한 뒤 최종 전송합니다.</p>
          </div>
        </form>
        {draft && (
          <div className="contact-draft" aria-label="메일 전송 안내">
            <p role="status">아직 전송되지 않았어요. 열린 메일 앱에서 보내기를 눌러주세요.</p>
            <p>메일 앱이 열리지 않았다면 내용을 복사해 <a href={`mailto:${profile.email}`}>{profile.email}</a>로 보내주세요.</p>
            <div className="contact-draft__actions"><a href={draft.href}>메일 앱 다시 열기 ↗</a><button type="button" onClick={copyDraft}>내용 복사</button></div>
            <p role="status">{copyStatus}</p>
            <details><summary>작성한 문의 내용 보기</summary><pre>{draft.text}</pre></details>
          </div>
        )}
      </div>
      <small className="contact__copyright">© 2026 CHOI SUBIN</small>
    </section>
  )
}

/* 작품 선택 화면 (피그마 104-8)
   Show Line-up의 작품 카드를 누르면 뒤 화면이 흐려지고(6px) 어두워지며(#171717 58%),
   가운데에 작품 썸네일과 ON STAGE(완성된 프로젝트) / BACKSTAGE(기획 의도와 작업 과정) 선택지가 뜹니다.
   - 썸네일·글꼴·닫기 위치는 수정된 시안(피그마 186-201)을 따릅니다: 흰 16:9 카드 + 로고, 선택지 글꼴 Min Sans.
   - ON STAGE: portfolio.ts의 url이 있으면 새 창으로 열고, 아직 없으면 준비 중 안내가 뜹니다.
   - BACKSTAGE: 백스테이지 페이지(피그마 96-516)가 있는 작품(국순당)은 그 페이지로 이동하고, 없으면 준비 중 안내가 뜹니다.
   Esc, 빈 곳 클릭, 오른쪽 위 '돌아가기 ×'로 닫습니다. */
function ProjectSelect({ project, onClose, onBackstage }: { project: Project | null; onClose: () => void; onBackstage: (project: Project) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [notice, setNotice] = useState('')
  const isOpen = project !== null
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (isOpen && !element.open) element.showModal()
    else if (!isOpen && element.open) element.close()
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isOpen])

  const close = () => dialog.current?.close()
  const choiceContent = (title: string, description: string) => <>
    <span className="stage-choice__title">{title}</span>
    <span className="stage-choice__desc">{description}</span>
  </>

  return (
    <dialog
      ref={dialog}
      className="project-select"
      aria-labelledby="project-select-title"
      onClose={() => { setNotice(''); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) close() }}
    >
      <button className="project-select__close" onClick={close}>돌아가기 ×</button>
      {project && (
        <div className="project-select__content">
          <h2 id="project-select-title" className="sr-only">{project.title}</h2>
          <ProjectCover project={project} className="project-select__cover" />
          <div className="project-select__choices">
            <OnStageChoice
              key={`on-${project.id}`}
              projectId={project.id}
              href={project.url}
              onClick={() => setNotice('완성된 프로젝트 페이지를 준비하고 있어요.')}
            >
              {choiceContent('ON STAGE', '완성된 프로젝트 보기')}
            </OnStageChoice>
            <BackstageChoice
              key={project.id}
              projectId={project.id}
              onClick={() => hasBackstage(project.id) ? onBackstage(project) : setNotice('기획 의도와 작업 과정 페이지를 준비하고 있어요.')}
            >
              {choiceContent('BACKSTAGE', '기획 의도와 작업 과정 보기')}
            </BackstageChoice>
          </div>
          <p className="project-select__notice" role="status">{notice}</p>
        </div>
      )}
    </dialog>
  )
}

// BACKSTAGE 페이지 주소: 주소 끝에 #backstage-kooksoondang 처럼 붙습니다.
// 그래서 브라우저 '뒤로 가기'로 닫히고, 이 주소로 바로 들어와도 백스테이지가 열립니다.
const BACKSTAGE_HASH = '#backstage-'
function readBackstageHash() {
  if (!window.location.hash.startsWith(BACKSTAGE_HASH)) return null
  const id = window.location.hash.slice(BACKSTAGE_HASH.length)
  return projects.find(project => project.id === id && hasBackstage(project.id)) ?? null
}

// 커서 물감 효과는 마우스(정밀 포인터)가 있는 기기에서만, 동작 줄이기 설정이 아닐 때만 켭니다.
const splashCursorQuery = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
function useSplashCursorEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(splashCursorQuery)
    const update = () => setEnabled(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return enabled
}

function Portfolio() {
  const splashCursor = useSplashCursorEnabled()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [backstageProject, setBackstageProject] = useState<Project | null>(readBackstageHash)
  useEffect(() => {
    const sync = () => setBackstageProject(readBackstageHash())
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])
  const openBackstage = (project: Project) => {
    setSelectedProject(null)
    window.history.pushState({ backstage: project.id }, '', BACKSTAGE_HASH + project.id)
    setBackstageProject(project)
  }
  // 이 사이트 안에서 연 경우에는 '뒤로 가기'와 같게 닫고, 주소로 바로 들어온 경우에는 주소 끝(#...)만 지웁니다.
  const closeBackstage = () => {
    if (window.history.state?.backstage) window.history.back()
    else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setBackstageProject(null)
    }
  }
  const [archiveOrigin, setArchiveOrigin] = useState<ArchiveOrigin | null>(null)
  useEffect(() => {
    document.title = 'Grand exhibition | 최수빈'
    document.documentElement.lang = 'ko'
  }, [])
  return (
    <>
      <a className="skip-link" href="#lineup">프로젝트 목록으로 이동</a>
      <main className="portfolio">
        <Hero />
        <StageWorks onSelect={setSelectedProject} />
        <ArtistGallery onOpen={setArchiveOrigin} />
        <DirectorsNote />
        <Contact />
        <MarqueeBand />
      </main>
      <ProjectSelect project={selectedProject} onClose={() => setSelectedProject(null)} onBackstage={openBackstage} />
      <Backstage project={backstageProject} onClose={closeBackstage} />
      <GalleryArchive origin={archiveOrigin} onClose={() => setArchiveOrigin(null)} />
      {/* 히어로 아래 물결(피그마 346-296)의 흰 부분부터 커서를 따라 코랄 물감이 번지고, Contact에 들어오면 서서히 사라집니다(React Bits Splash Cursor). */}
      {splashCursor && <SplashCursor startBelow=".hero-curve" startEdge={heroCurveEdge} fadeInto="#contact" />}
    </>
  )
}


// Keep the exhibition unmounted until admission so its opening animations start on entry.
export default function App() {
  const [entered, setEntered] = useState(hasEnteredPortfolio)
  const admittedNow = useRef(false)
  useEffect(() => {
    if (!entered || !admittedNow.current) return
    const main = document.querySelector<HTMLElement>('main.portfolio')
    main?.setAttribute('tabindex', '-1')
    main?.focus({ preventScroll: true })
  }, [entered])
  if (!entered) return <EntryTicket onEnter={() => { admittedNow.current = true; setEntered(true) }} />
  return <Portfolio />
}
