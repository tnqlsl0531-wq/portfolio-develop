import { Component, Fragment, Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, RefObject } from 'react'
import { galleryPhotos, heroPhotos, plannedProjectPages, profile, projects } from './portfolio'
import type { PhotoPosition, Project } from './portfolio'
import heroCurve from './assets/design/hero-curve.svg'
import heroCurveColor from './assets/design/hero-curve-color.svg'
import chevron from './assets/design/chevron.svg'
import kooksoondangLogo from './assets/design/kooksoondang-logo.svg'
import kooksoondangDot from './assets/design/kooksoondang-dot.svg'
import jaduLogo from './assets/design/jadu-logo.svg'
import questionMark from './assets/design/question-mark.svg'
import paperclip from './assets/design/paperclip.svg'
import StrokePresenter from './components/StrokePresenter'

// 3D 목줄은 용량이 커서 Contact 섹션에 가까워졌을 때만 불러옵니다.
const Lanyard = lazy(() => import('./components/Lanyard'))
import './App.css'

type Detail = { kind: 'project'; project: Project } | { kind: 'gallery' } | null

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

// 같은 사진을 두 장 겹칩니다. 아래 장은 채도를 90% 뺀 사진, 위 장은 원래 색 사진이며
// 위 장은 커서 주변 원 안에서만 보입니다(가장자리 페이드는 바깥 틀이 두 장에 함께 적용).
// data-reveal: 커서 위치(--mx/--my)를 받는 요소 표시(App.tsx useHeroColorReveal)
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
   - 마우스가 없는 기기(터치)에서는 처음부터 원래 색으로 보입니다(CSS). */
const REVEAL_FOLLOW = 0.07 // 원이 커서를 따라가는 시간(초). 작을수록 바로 붙습니다.
const REVEAL_FADE = 0.2 // 원이 나타나고 사라지는 시간(초)

// stage: 히어로 + 아래 물결을 감싼 영역. 이 안에서 마우스가 움직이는 동안 원이 따라다닙니다.
function useHeroColorReveal(stageRef: RefObject<HTMLElement | null>, heroRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const stage = stageRef.current
    const hero = heroRef.current
    if (!stage || !hero || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    // 색 레이어(사진·글자·배경·물결)마다 자기 기준의 커서 위치를 넣어줍니다.
    const targets = [...stage.querySelectorAll<HTMLElement>('[data-reveal]')]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const s = { x: 0, y: 0, sx: 0, sy: 0, active: 0, target: 0, raf: 0, prev: 0 }

    const apply = () => {
      stage.style.setProperty('--reveal', s.active.toFixed(3))
      // 원 크기: 히어로 높이의 21% (물결은 히어로 밖에 있어서 px로 넘겨줍니다)
      stage.style.setProperty('--reveal-r', (hero.clientHeight * 0.21).toFixed(1) + 'px')
      const base = stage.getBoundingClientRect()
      for (const target of targets) {
        const box = target.getBoundingClientRect()
        target.style.setProperty('--mx', (s.sx - (box.left - base.left)).toFixed(1) + 'px')
        target.style.setProperty('--my', (s.sy - (box.top - base.top)).toFixed(1) + 'px')
      }
    }
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - s.prev) / 1000))
      s.prev = now
      const follow = reduced ? 1 : 1 - Math.exp(-dt / REVEAL_FOLLOW)
      const fade = reduced ? 1 : 1 - Math.exp(-dt / REVEAL_FADE)
      s.sx += (s.x - s.sx) * follow
      s.sy += (s.y - s.sy) * follow
      s.active += (s.target - s.active) * fade
      const settled = Math.abs(s.x - s.sx) < 0.2 && Math.abs(s.y - s.sy) < 0.2 && Math.abs(s.target - s.active) < 0.002
      if (settled) {
        s.sx = s.x
        s.sy = s.y
        s.active = s.target
      }
      apply()
      s.raf = settled ? 0 : requestAnimationFrame(tick)
    }
    const start = () => {
      if (s.raf) return
      s.prev = performance.now()
      s.raf = requestAnimationFrame(tick)
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const rect = stage.getBoundingClientRect()
      s.x = event.clientX - rect.left
      s.y = event.clientY - rect.top
      // 원이 사라진 상태에서 다시 들어오면 커서 위치에서 바로 나타나게 합니다(미끄러져 오지 않게).
      if (s.active < 0.02) {
        s.sx = s.x
        s.sy = s.y
      }
      s.target = 1
      start()
    }
    const onLeave = () => {
      s.target = 0
      start()
    }
    stage.addEventListener('pointermove', onMove, { passive: true })
    stage.addEventListener('pointerenter', onMove, { passive: true })
    stage.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      if (s.raf) cancelAnimationFrame(s.raf)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerenter', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [stageRef, heroRef])
}

function Hero() {
  const stageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  useHeroColorReveal(stageRef, heroRef)
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

function ProjectArtwork({ project }: { project: Project }) {
  return (
    <div className={`project-artwork project-artwork--${project.id}`}>
      {project.id === 'kooksoondang' ? (
        <>
          <div className="project-artwork__kooksoondang"><img src={kooksoondangLogo} alt="국순당" /></div>
          <img className="project-artwork__dot" src={kooksoondangDot} alt="" />
        </>
      ) : <img className="project-artwork__jadu" src={jaduLogo} alt="자두야" />}
      <span className="project-artwork__badge">쇼 종료</span>
    </div>
  )
}

function ComingSoon() {
  return (
    <article className="project-card project-card--soon" aria-label="준비 중인 프로젝트">
      <div className="project-artwork project-artwork--soon"><img src={questionMark} alt="" /></div>
      <p className="project-card__coming">COMING<br />SOON</p>
    </article>
  )
}

function ShowLineup({ onSelect }: { onSelect: (project: Project) => void }) {
  const [team, setTeam] = useState('Team')
  const [platform, setPlatform] = useState('All')
  const [page, setPage] = useState(1)
  const filtered = projects.filter(project =>
    (team === 'All' || project.team === team) && (platform === 'All' || project.platform === platform),
  )
  const pageCount = filtered.length ? Math.max(plannedProjectPages, Math.ceil(filtered.length / 4)) : 1

  return (
    <section id="lineup" className="lineup" aria-labelledby="lineup-title">
      <div className="lineup__inner">
        <h2 id="lineup-title" className="section-heading lineup__title">Show Line-up</h2>
        <div className="lineup__filters">
          <label className="filter">
            <span className="sr-only">프로젝트 참여 유형</span>
            <select value={team} onChange={event => { setTeam(event.target.value); setPage(1) }}>
              <option value="All">All</option><option value="Team">Team</option><option value="Personal">Personal</option>
            </select>
            <img src={chevron} alt="" />
          </label>
          <label className="filter">
            <span className="sr-only">프로젝트 플랫폼</span>
            <select value={platform} onChange={event => { setPlatform(event.target.value); setPage(1) }}>
              <option value="All">All</option><option value="Web">Web</option><option value="App">App</option>
            </select>
            <img src={chevron} alt="" />
          </label>
        </div>
        {filtered.length ? (
          <div className="lineup__cards">
            {Array.from({ length: 4 }, (_, index) => {
              const project = filtered[(page - 1) * 4 + index]
              return project ? (
                <button key={project.id} className="project-card project-card--ready" onClick={() => onSelect(project)} aria-label={`${project.title} 자세히 보기`}>
                  <div className="project-card__content">
                    <ProjectArtwork project={project} />
                    <h3 className="project-card__title" title={project.title}>{project.title}</h3>
                    <dl className="project-card__meta">
                      <div><dt>기관:</dt><dd>{project.organization}</dd></div>
                      <div><dt>유형:</dt><dd>{project.team === 'Team' ? '팀프로젝트' : '개인프로젝트'}</dd></div>
                    </dl>
                  </div>
                  <p className="project-card__period">{project.period}</p>
                </button>
              ) : <ComingSoon key={`soon-${page}-${index}`} />
            })}
          </div>
        ) : (
          <div className="lineup__empty">
            <p>이 조건에 해당하는 프로젝트는 준비 중이에요.</p>
            <button onClick={() => { setTeam('All'); setPlatform('All'); setPage(1) }}>전체 프로젝트 보기 →</button>
          </div>
        )}
        <nav className="pagination" aria-label="프로젝트 페이지">
          {page > 1 && <button onClick={() => setPage(current => current - 1)} aria-label="이전 프로젝트 페이지">← 이전</button>}
          <span aria-live="polite" aria-atomic="true">{page} / {pageCount}</span>
          <button onClick={() => setPage(current => Math.min(current + 1, pageCount))} disabled={page === pageCount} aria-label="다음 프로젝트 페이지">다음&nbsp; →</button>
        </nav>
      </div>
    </section>
  )
}

function ArtistGallery({ onOpen }: { onOpen: () => void }) {
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
            {[0, 1, 2, 3].map(track => (
              <div className="gallery__column" key={track}>
                <div className={`gallery__moving gallery__moving--${track % 2 === 0 ? 'up' : 'down'}`}>
                  {[0, 1].map(copy => (
                    <div className="gallery__sequence" key={copy}>
                      {galleryPhotos.slice(track * 10, track * 10 + 10).map((photo, index) => (
                        <div className={`gallery__photo gallery__photo--${(track + index) % 3}`} key={index}>
                          {photo.src && <img src={photo.src} alt="" loading="lazy" />}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="gallery__fade gallery__fade--bottom" />
        <div className="gallery__fade gallery__fade--edge" />
        <div className="gallery__fade gallery__fade--top" />
      </div>
      <div className="gallery__intro">
        <div className="gallery__heading">
          <h2 id="gallery-title" className="section-heading gallery__title">Artist<br />Gallery</h2>
          <p>아티스트 포토 아카이브전</p>
        </div>
        <button className="gallery__link" onClick={onOpen}>
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
      <h2 id="director-title" className="section-heading director__title">Director’s Note</h2>
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
              <Fragment key={lineIndex}>{lineIndex > 0 && ' '}<span className="director__line">{line}</span></Fragment>
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

function ContactPass() {
  const area = useRef<HTMLDivElement>(null)
  const enabled = useLanyardEnabled()
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const show3D = enabled && !failed

  useEffect(() => {
    const element = area.current
    if (!element) return
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true) }, { rootMargin: '800px 0px' })
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 })
    nearObserver.observe(element)
    visibleObserver.observe(element)
    return () => {
      nearObserver.disconnect()
      visibleObserver.disconnect()
    }
  }, [])

  return (
    <div ref={area} className="contact__pass-area" data-lanyard={show3D ? '3d' : 'static'}>
      {show3D ? (
        near && (
          <div className="contact__lanyard" aria-hidden="true">
            <LanyardBoundary onError={() => setFailed(true)}>
              <Suspense fallback={null}>
                <Lanyard active={visible} />
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

function Contact() {
  const [draft, setDraft] = useState<{ href: string; text: string } | null>(null)
  const [copyStatus, setCopyStatus] = useState('')

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
      <ContactPass />
      <div className="contact__form-area">
        <img className="contact__paperclip" src={paperclip} alt="" aria-hidden="true" />
        <form className="contact-form" onSubmit={submitInquiry} onChange={() => { if (draft) setDraft(null) }}>
          <div className="contact-form__heading"><h3>GET IN TOUCH</h3><p>함께할 프로젝트나 제안을 남겨주세요.</p></div>
          <div className="contact-form__pair">
            <label>이름 *<input name="name" autoComplete="name" placeholder="이름을 입력해주세요" required maxLength={80} pattern=".*\S.*" /></label>
            <label>소속 (선택)<input name="organization" autoComplete="organization" placeholder="회사 또는 단체명" maxLength={100} /></label>
          </div>
          <label>이메일 *<input name="email" type="email" autoComplete="email" placeholder="답변 받을 이메일 주소" required maxLength={150} /></label>
          <label><span id="contact-topic-label">문의 유형 *</span><select name="topic" aria-labelledby="contact-topic-label" defaultValue="" required>
            <option value="" disabled>채용 / 디자인 협업 / 공연·콘텐츠 / 기타</option>
            <option>채용</option><option>디자인 협업</option><option>공연·콘텐츠</option><option>기타</option>
          </select></label>
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

function DetailDialog({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const isOpen = detail !== null
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

  let content: ReactNode = null
  if (detail?.kind === 'project') {
    const project = detail.project
    content = <>
      <ProjectArtwork project={project} />
      <h2 id="detail-title">{project.title}</h2>
      <dl className="detail-dialog__meta">
        <div><dt>기관</dt><dd>{project.organization}</dd></div>
        <div><dt>유형</dt><dd>{project.team === 'Team' ? '팀프로젝트' : '개인프로젝트'} · {project.platform}</dd></div>
        <div><dt>기간</dt><dd>{project.period}</dd></div>
      </dl>
      {project.url ? <a className="detail-dialog__action" href={project.url} target="_blank" rel="noreferrer">프로젝트 보러가기 ↗</a> : <p className="detail-dialog__notice">프로젝트 상세 내용과 링크는 준비 중입니다.</p>}
    </>
  } else if (detail?.kind === 'gallery') {
    const photos = galleryPhotos.filter(photo => photo.src)
    content = <>
      <h2 id="detail-title" className="section-heading">Artist Gallery</h2>
      <p>아티스트 포토 아카이브전</p>
      {photos.length ? <div className="gallery-detail">{photos.map((photo, index) => <img key={index} src={photo.src} alt={photo.alt} loading="lazy" />)}</div> : <div className="gallery-detail__empty"><p>사진을 준비하고 있어요.</p><span>사진이 등록되면 이곳에서 모아볼 수 있습니다.</span></div>}
    </>
  }

  return (
    <dialog ref={dialog} className="detail-dialog" aria-labelledby="detail-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="detail-dialog__body">
        <button className="detail-dialog__close" onClick={onClose} aria-label="상세 화면 닫기">닫기 ×</button>
        {content}
      </div>
    </dialog>
  )
}

export default function App() {
  const [detail, setDetail] = useState<Detail>(null)
  useEffect(() => {
    document.title = 'Grand exhibition | 최수빈'
    document.documentElement.lang = 'ko'
  }, [])
  return (
    <>
      <a className="skip-link" href="#lineup">프로젝트 목록으로 이동</a>
      <main className="portfolio">
        <Hero />
        <ShowLineup onSelect={project => setDetail({ kind: 'project', project })} />
        <ArtistGallery onOpen={() => setDetail({ kind: 'gallery' })} />
        <DirectorsNote />
        <Contact />
      </main>
      <DetailDialog detail={detail} onClose={() => setDetail(null)} />
    </>
  )
}
