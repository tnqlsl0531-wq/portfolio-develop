import { Component, Fragment, Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
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
import { useColorReveal } from './hooks/useColorReveal'
import GalleryArchive from './components/GalleryArchive'
import ProjectCover from './components/ProjectCover'
import Backstage, { hasBackstage } from './components/Backstage'
import type { ArchiveOrigin } from './components/GalleryArchive'

// 3D 목줄은 용량이 커서 Contact 섹션에 가까워졌을 때만 불러옵니다.
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
            {project.url ? (
              <a className="stage-choice stage-choice--on" href={project.url} target="_blank" rel="noreferrer">
                {choiceContent('ON STAGE', '완성된 프로젝트 보기')}
              </a>
            ) : (
              <button className="stage-choice stage-choice--on" onClick={() => setNotice('완성된 프로젝트 페이지를 준비하고 있어요.')}>
                {choiceContent('ON STAGE', '완성된 프로젝트 보기')}
              </button>
            )}
            <button
              className="stage-choice stage-choice--back"
              onClick={() => hasBackstage(project.id) ? onBackstage(project) : setNotice('기획 의도와 작업 과정 페이지를 준비하고 있어요.')}
            >
              {choiceContent('BACKSTAGE', '기획 의도와 작업 과정 보기')}
            </button>
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

export default function App() {
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
        <ShowLineup onSelect={setSelectedProject} />
        <ArtistGallery onOpen={setArchiveOrigin} />
        <DirectorsNote />
        <Contact />
      </main>
      <ProjectSelect project={selectedProject} onClose={() => setSelectedProject(null)} onBackstage={openBackstage} />
      <Backstage project={backstageProject} onClose={closeBackstage} />
      <GalleryArchive origin={archiveOrigin} onClose={() => setArchiveOrigin(null)} />
    </>
  )
}
