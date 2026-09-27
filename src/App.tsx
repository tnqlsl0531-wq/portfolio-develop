import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { galleryPhotos, heroPhotos, plannedProjectPages, profile, projects } from './portfolio'
import type { PhotoPosition, Project } from './portfolio'
import heroCurve from './assets/design/hero-curve.svg'
import chevron from './assets/design/chevron.svg'
import kooksoondangLogo from './assets/design/kooksoondang-logo.svg'
import kooksoondangDot from './assets/design/kooksoondang-dot.svg'
import jaduLogo from './assets/design/jadu-logo.svg'
import questionMark from './assets/design/question-mark.svg'
import paperclip from './assets/design/paperclip.svg'
import StrokePresenter from './components/StrokePresenter'
import './App.css'

type Detail = { kind: 'project'; project: Project } | { kind: 'gallery' } | null

const photoDescriptions: Record<PhotoPosition, string> = {
  main: '최수빈의 메인 공연 사진',
  upper: '최수빈의 보조 공연 사진',
  right: '최수빈의 두 번째 보조 공연 사진',
}

function PhotoSlot({ position }: { position: PhotoPosition }) {
  const src = heroPhotos[position]
  const className = 'hero__photo hero__photo--' + position
  return src ? (
    <img className={className} src={src} alt={photoDescriptions[position]} />
  ) : (
    <div className={className} role="img" aria-label={photoDescriptions[position] + ' 자리'} />
  )
}

function Hero() {
  return (
    <>
      <section className="hero" aria-labelledby="exhibition-title">
        <div className="hero__shade" aria-hidden="true" />
        <PhotoSlot position="right" />
        <h1 id="exhibition-title" className="hero__title">
          <span className="hero__word hero__word--grand">GRAND</span>{' '}
          <span className="hero__word hero__word--exhibition">EXHIBITION</span>
        </h1>
        <PhotoSlot position="main" />
        <PhotoSlot position="upper" />
        <StrokePresenter />
      </section>
      <img className="hero-curve" src={heroCurve} alt="" aria-hidden="true" />
    </>
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
        <h2 id="gallery-title" className="section-heading gallery__title">Artist<br />Gallery</h2>
        <p>아티스트 포토 아카이브전</p>
        <button className="gallery__link" onClick={onOpen}>자세히 보러가기 <span aria-hidden="true">→</span></button>
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
            <img className="director__portrait" src={profile.portrait} alt={`${profile.name} 프로필`} loading="lazy" />
          ) : <div className="director__portrait" role="img" aria-label="최수빈 프로필 사진 자리" />}
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
              <dl>{profile.history.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
            </div>
          </div>
          <div className="director__paragraphs">{profile.paragraphs.map((paragraph, index) => <p key={index} lang="en">{paragraph}</p>)}</div>
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
      <div className="contact__pass-area">
        <div className="contact__strap" aria-hidden="true" />
        <h2 id="contact-title" className="section-heading contact__title">Contact</h2>
        <div className="contact__connector" aria-hidden="true" />
        <StaffPass />
      </div>
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
            <button type="submit">문의 보내기 <span aria-hidden="true">↗</span></button>
            <p>메일 앱에서 내용을 확인한 뒤 최종 전송합니다.</p>
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
