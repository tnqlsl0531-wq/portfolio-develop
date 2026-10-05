import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { Project } from '../portfolio'
import ProjectCover from './ProjectCover'
import StageCurtain from './StageCurtain'
import { useColorReveal } from '../hooks/useColorReveal'
import type { BackstageContent, CueKind } from './backstage/parts'
import { kooksoondangBackstage } from './backstage/kooksoondang'
import { jaduBackstage } from './backstage/jadu'
import './Backstage.css'

/* BACKSTAGE 페이지 — 큐시트 구조(피그마 426-190, 10/1 교체): 작품 선택 화면의 BACKSTAGE를 누르면 열리는 어두운 페이지입니다.
   공연 큐시트처럼 CUE 00(막 오르기 전) → CUE 06(커튼콜) 순서로 내려가고, 맨 끝에 무대 커튼 + GO ONSTAGE가 있습니다.
   - 이 파일은 모든 작품이 같이 쓰는 '틀'입니다(10/5 분리): 맨 위 줄 · 왼쪽 큐시트 · 히어로와 섹션 뼈대 · 스크롤 움직임 · 마지막 커튼.
     작품마다 다른 내용(글 · 사진 · 영상)은 ./backstage/작품이름.tsx, 같이 쓰는 조각(캡처 카드 · 영상 칸 등)은 ./backstage/parts.tsx에 있습니다.
     새 작품을 추가하려면 내용 파일을 하나 만들고 아래 CONTENT에 한 줄 넣으면 됩니다.
   - 주소 끝에 #backstage-작품이름 이 붙어서, 브라우저 '뒤로 가기'를 누르면 원래 화면으로 돌아옵니다.
   - 맨 위 줄('← 돌아가기' · '기획서 보러가기')은 스크롤하면 화면 맨 위에 붙어 있습니다(sticky, 뒤 흐림).
   - 왼쪽 큐시트(CueSheet)는 화면에 고정돼 있고, 스크롤해도 움직이지 않습니다(10/1 완전 고정). 지금 섹션의 램프가 켜집니다.
   - 섹션별 움직임 값은 아래 MOTION에서 조절합니다. 기획서 주소는 portfolio.ts의 planUrl, GO ONSTAGE는 url입니다. */

// 작품별 백스테이지 내용. 여기에 있는 작품만 BACKSTAGE 버튼으로 열립니다.
const CONTENT: Partial<Record<Project['id'], BackstageContent>> = {
  kooksoondang: kooksoondangBackstage,
  jadu: jaduBackstage,
}
export const hasBackstage = (id: Project['id']) => id in CONTENT

/* 움직임 값(피그마 1920 기준 px)
   cast     : CUE 01 사진이 플레이빌 카드 뒤에서 나오는 구간. 카드 묶음 윗선이 화면 높이의 start 지점에 오면 시작해 end 지점에서 다 나옵니다.
              나오기 전에는 피그마 자리보다 60px만 카드 뒤로 더 들어가 있습니다(Backstage.css .backstage__cast-photo). follow = 스크롤을 따라가는 부드러움(초).
   parallax : CUE 03·06 배경사진이 페이지보다 천천히 움직이는 정도(speed)와 최대 거리(max). 다른 섹션까지 넘어가지 않게 max로 막아 둡니다.
              사진마다 data-parallax 숫자만큼 곱해집니다(CUE 03 = 1.6배, CUE 06 = 1배).
   timeline : CUE 03 기록에 불이 켜지는 기준선(화면 높이 비율). */
const MOTION = {
  cast: { start: 0.9, end: 0.36, follow: 0.14 },
  parallax: { speed: 0.24, max: 80 },
  timeline: { line: 0.62 },
}

// 큐시트 목록(피그마 427:1043). 섹션 순서와 같습니다. CUE 00은 히어로, 01~06은 kind에 맞는 작품 내용(content.cues)이 들어갑니다.
const CUES: { no: string; label: string; kind?: CueKind; title?: string }[] = [
  { no: '00', label: '막 오르기 전' },
  { no: '01', label: '캐스트 & 크루', kind: 'cast', title: 'CAST & CREW' },
  { no: '02', label: '대본 리딩', kind: 'script', title: 'SCRIPT READING' },
  { no: '03', label: '리허설 일지', kind: 'log', title: 'REHEARSAL LOG' },
  { no: '04', label: '리허설 → 본공연', kind: 'show', title: 'REHEARSAL → MAIN SHOW' },
  { no: '05', label: '무대 세트', kind: 'set', title: 'STAGE SET' },
  { no: '06', label: '커튼콜', kind: 'call', title: 'CURTAIN CALL' },
]

/* 섹션 제목 묶음(CUE 번호 + 가는 선 · 영문 제목 · 한 줄 설명). 화면에 들어오면 선이 그어지며 떠오릅니다. */
function CueHead({ index, title, sub }: { index: number; title: string; sub: string }) {
  return (
    <header className="backstage__cue-head" data-appear="">
      <p className="backstage__cue-label"><span>CUE {CUES[index].no}</span><i aria-hidden="true" /></p>
      <h3 id={`backstage-cue-${index}`} className="backstage__cue-title">{title}</h3>
      <p className="backstage__cue-sub">{sub}</p>
    </header>
  )
}

/* ── 큐시트(왼쪽 고정 목차) ─────────────────────────────
   램프: 지난 큐는 은은하게 켜진 채 남고(done), 지금 큐는 주황으로 환하게 켜지며 글자가 조금 앞으로 나오고(current), 남은 큐는 꺼져 있습니다(next).
   세로선은 지나온 만큼 주황으로 차오릅니다(--rail). 마지막 커튼(무대가 준비되었습니다)에 오면 조용히 사라집니다. */
function CueSheet({ navRef, active, hidden, onJump }: {
  navRef: RefObject<HTMLElement | null>
  active: number
  hidden: boolean
  onJump: (index: number) => void
}) {
  return (
    <nav ref={navRef} className="backstage__cuesheet" aria-label="큐시트" data-hidden={hidden || undefined}>
      <p className="backstage__cuesheet-title">CUE SHEET</p>
      <ol className="backstage__cuesheet-list">
        <li className="backstage__cuesheet-rail" aria-hidden="true"><i /></li>
        {CUES.map((cue, index) => (
          <li key={cue.no} className="backstage__cuesheet-item" style={{ '--i': index } as CSSProperties}
            data-state={index < active ? 'done' : index === active ? 'current' : 'next'}>
            <a href={`#backstage-cue-${index}`} aria-current={index === active ? 'step' : undefined}
              onClick={event => { event.preventDefault(); onJump(index) }}>
              <span className="backstage__lamp" aria-hidden="true" />
              <span className="backstage__cuesheet-text">
                <span className="backstage__cuesheet-no">CUE {cue.no}</span>
                <span className="backstage__cuesheet-name">{cue.label}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/* ── 스크롤에 맞춰 움직이는 것들을 한곳에서 계산합니다(스크롤 한 번에 한 프레임) ──
   큐시트 램프·세로선 · 맨 위 줄 배경(--intro-fade) · CUE 01 사진 나오기 · CUE 03·06 배경사진 패럴랙스 · CUE 03 기록 불 켜기 */
function useBackstageMotion(dialog: RefObject<HTMLDialogElement | null>, isOpen: boolean, onActive: (index: number, hidden: boolean) => void) {
  const onActiveRef = useRef(onActive)
  useEffect(() => { onActiveRef.current = onActive }, [onActive])
  useEffect(() => {
    const scroller = dialog.current
    const page = scroller?.querySelector<HTMLElement>('.backstage__page')
    if (!scroller || !page || !isOpen) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compact = window.matchMedia('(max-width: 700px), (max-width: 1200px) and (pointer: coarse)')
    const sections = [...page.querySelectorAll<HTMLElement>('[data-cue]')]
    const nav = page.querySelector<HTMLElement>('.backstage__cuesheet')
    const lamps = nav ? [...nav.querySelectorAll<HTMLElement>('.backstage__lamp')] : []
    const cast = page.querySelector<HTMLElement>('.backstage__cast')
    const backdrops = [...page.querySelectorAll<HTMLElement>('[data-parallax]')]
    const timeline = page.querySelector<HTMLElement>('.backstage__timeline')
    const logs = timeline ? [...timeline.querySelectorAll<HTMLElement>('.backstage__log')] : []
    const finale = page.querySelector<HTMLElement>('.backstage__finale')
    const state = {
      raf: 0, last: 0, active: -1, hidden: false,
      pull: 0, pullTarget: 0, fill: -1,
    }
    const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

    const measure = () => {
      const view = scroller.clientHeight
      const unit = page.clientWidth / 1920
      const top = scroller.scrollTop
      // 맨 위 줄 배경: 첫 화면에서는 없고, 화면 높이의 25%만큼 내리면 다 생깁니다(--intro-fade 1 → 0).
      page.style.setProperty('--intro-fade', (1 - clamp(top / (view * 0.25))).toFixed(3))
      // 지금 큐: 섹션 윗선이 화면 42% 지점을 지났는지
      const line = view * 0.42
      let active = 0
      let progress = 0
      sections.forEach((section, index) => {
        const box = section.getBoundingClientRect()
        if (box.top <= line) {
          active = index
          progress = clamp((line - box.top) / Math.max(1, box.height))
        }
      })
      const hidden = finale ? finale.getBoundingClientRect().top < view * 0.62 : false
      if (active !== state.active || hidden !== state.hidden) {
        state.active = active
        state.hidden = hidden
        onActiveRef.current(active, hidden)
      }
      // 큐시트 세로선: 지금 램프에서 다음 램프 쪽으로 섹션을 읽은 만큼 차오릅니다.
      if (nav && lamps.length) {
        const base = lamps[0].offsetTop
        const here = lamps[active].offsetTop - base
        const next = lamps[Math.min(lamps.length - 1, active + 1)].offsetTop - base
        nav.style.setProperty('--rail', `${(here + (next - here) * progress).toFixed(1)}px`)
      }
      // CUE 01: 카드 묶음 윗선 기준으로 사진이 나오는 정도(0~1)
      if (cast) {
        const box = cast.getBoundingClientRect()
        state.pullTarget = compact.matches || reduced.matches ? 1
          : clamp((MOTION.cast.start * view - box.top) / ((MOTION.cast.start - MOTION.cast.end) * view))
      }
      // CUE 03·06 배경사진: 사진 가운데가 화면 가운데에 올 때 피그마 자리, 그 전후로 천천히(최대 max까지만)
      if (!reduced.matches) {
        const center = view / 2
        const speed = MOTION.parallax.speed * (compact.matches ? 0.6 : 1)
        const limit = MOTION.parallax.max * (compact.matches ? 0.5 : unit)
        for (const photo of backdrops) {
          const box = photo.parentElement!.getBoundingClientRect()
          const boost = Number(photo.dataset.parallax) || 1
          const offset = clamp((center - (box.top + box.height / 2)) * speed * boost, -limit * boost, limit * boost)
          photo.style.setProperty('--parallax', `${offset.toFixed(1)}px`)
        }
      }
      // CUE 03 선: 기준선(화면 62%)까지 내려온 만큼 차오르고, 선이 닿은 기록은 불이 켜집니다.
      if (timeline) {
        const box = timeline.getBoundingClientRect()
        const fill = reduced.matches ? 1 : clamp((MOTION.timeline.line * view - box.top) / Math.max(1, box.height))
        if (Math.abs(fill - state.fill) > 0.001) {
          state.fill = fill
          timeline.style.setProperty('--fill', fill.toFixed(4))
          for (const log of logs) {
            const reach = (log.offsetTop + 12 * unit) / Math.max(1, box.height)
            const lit = fill >= reach - 0.002
            if (lit !== (log.dataset.lit === 'true')) log.dataset.lit = String(lit)
          }
        }
      }
    }

    const frame = (now: number) => {
      state.raf = 0
      const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 30) : 1 / 60
      state.last = now
      measure()
      let moving = false
      // CUE 01 사진: 스크롤 위치를 부드럽게 따라갑니다.
      if (cast) {
        const k = 1 - Math.exp(-dt / MOTION.cast.follow)
        state.pull += (state.pullTarget - state.pull) * k
        if (Math.abs(state.pullTarget - state.pull) < 0.0008) state.pull = state.pullTarget
        else moving = true
        cast.style.setProperty('--pull', state.pull.toFixed(4))
      }
      if (moving) state.raf = requestAnimationFrame(frame)
      else state.last = 0
    }
    const request = () => { if (!state.raf) state.raf = requestAnimationFrame(frame) }
    const resize = new ResizeObserver(request)
    resize.observe(page)
    request()
    scroller.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    return () => {
      cancelAnimationFrame(state.raf)
      resize.disconnect()
      scroller.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
    }
  }, [dialog, isOpen])
}

/* 화면에 들어오면 한 번 떠오르는 요소들([data-appear] → data-shown). 동작 줄이기 설정이면 처음부터 보입니다. */
function useAppear(dialog: RefObject<HTMLDialogElement | null>, isOpen: boolean) {
  useEffect(() => {
    const scroller = dialog.current
    if (!scroller || !isOpen) return
    const items = [...scroller.querySelectorAll<HTMLElement>('[data-appear]')]
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(item => { item.dataset.shown = '' })
      return
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        ;(entry.target as HTMLElement).dataset.shown = ''
        observer.unobserve(entry.target)
      }
    }, { root: scroller, rootMargin: '0px 0px -12% 0px', threshold: 0.08 })
    items.forEach(item => observer.observe(item))
    return () => observer.disconnect()
  }, [dialog, isOpen])
}

export default function Backstage({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const nav = useRef<HTMLElement>(null)
  const [notice, setNotice] = useState('')
  const [cue, setCue] = useState({ active: 0, hidden: false })
  const content = project ? CONTENT[project.id] : undefined
  const isOpen = project !== null
  const handleActive = useCallback((active: number, hidden: boolean) => setCue({ active, hidden }), [])
  useBackstageMotion(dialog, isOpen, handleActive)
  useAppear(dialog, isOpen)

  // 마지막 단체 사진 + 무대 커튼
  // - 3D 벨벳 커튼(봉·가림막·커튼 두 폭)이 동그란 단체 사진을 늘 덮고 있습니다.
  // - 마우스를 올리면 커서 주변 원(사진 크기의 32%) 안에서만 커튼 너머 단체 사진(원래 색)이 보이고, 커튼은 아주 살짝 찰랑거립니다.
  //   터치 기기는 누른 자리에 원이 나타났다가 1.5초 뒤 사라집니다.
  const stage = useRef<HTMLDivElement>(null)
  useColorReveal(stage, stage, 0.32, isOpen, { touch: true })
  const [curtainHover, setCurtainHover] = useState(false)
  // 커튼 가운데 안내 문구: 처음 마우스를 올리면(터치는 누르면) 천천히 사라지고, 페이지를 닫기 전까지 다시 나오지 않습니다.
  const [hintGone, setHintGone] = useState(false)
  const tapTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(tapTimer.current), [])
  useEffect(() => {
    if (isOpen) return
    setCurtainHover(false)
    setHintGone(false)
    setCue({ active: 0, hidden: false })
  }, [isOpen])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (isOpen && !element.open) {
      element.showModal()
      // 열자마자 '← 돌아가기'에 초점 테두리가 생기지 않게 창 자체에 초점을 둡니다(Esc로 닫기는 그대로).
      element.focus({ preventScroll: true })
      element.scrollTop = 0
    } else if (!isOpen && element.open) element.close()
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isOpen])

  // 준비 중 안내는 잠깐 보였다가 사라집니다.
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  // 큐시트에서 고른 섹션으로 부드럽게 이동(맨 위 줄에 가리지 않게 조금 위에서 멈춤)
  const jump = useCallback((index: number) => {
    const scroller = dialog.current
    const section = scroller?.querySelector<HTMLElement>(`[data-cue="${index}"]`)
    if (!scroller || !section) return
    const top = index === 0 ? 0 : section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - scroller.clientHeight * 0.12
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  }, [])

  return (
    <dialog
      ref={dialog}
      className="backstage"
      aria-labelledby="backstage-title"
      tabIndex={-1}
      onCancel={event => { event.preventDefault(); onClose() }}
    >
      {project && content && (
        <div className="backstage__frame">
          <article className="backstage__page">
            <div className="backstage__floor" aria-hidden="true" />

            {/* 맨 위 줄: 스크롤하면 화면 맨 위에 붙어 있습니다(뒤 흐림). */}
            <div className="backstage__bar-track">
              <div className="backstage__bar">
                <button className="backstage__back" onClick={onClose}><span aria-hidden="true">←</span> 돌아가기</button>
                {project.planUrl ? (
                  <a className="backstage__plan" href={project.planUrl} target="_blank" rel="noreferrer">기획서 보러가기</a>
                ) : (
                  <button className="backstage__plan" onClick={() => setNotice('기획서 링크를 준비하고 있어요.')}>기획서 보러가기</button>
                )}
              </div>
            </div>

            <CueSheet navRef={nav} active={cue.active} hidden={cue.hidden} onJump={jump} />

            {/* CUE 00 · 막 오르기 전(히어로): 전구 다섯 개가 차례로 켜지고, 작품 카드와 수상·정보가 떠오릅니다. */}
            <section className="backstage__hero" data-cue="0" aria-labelledby="backstage-title">
              <div className="backstage__hero-top">
                <p className="backstage__eyebrow">{content.eyebrow}</p>
                <div className="backstage__marquee">
                  <div className="backstage__bulbs" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map(index => <i key={index} style={{ '--i': index } as CSSProperties} />)}
                  </div>
                  <ProjectCover project={project} className="backstage__hero-cover" />
                </div>
              </div>
              <div className="backstage__hero-info">
                <h2 id="backstage-title" className="backstage__hero-title">{project.title}</h2>
                <div className="backstage__hero-meta">{content.heroMeta}</div>
              </div>
            </section>

            {/* CUE 01~06: 섹션 뼈대(뒤 사진 → 제목 묶음 → 내용)는 같고, 안에 들어가는 내용만 작품마다 다릅니다. */}
            {CUES.map((item, index) => {
              if (!item.kind || !item.title) return null
              const part = content.cues[item.kind]
              return (
                <section key={item.kind} className={`backstage__cue backstage__cue--${item.kind}`} data-cue={index} aria-labelledby={`backstage-cue-${index}`}>
                  {part.backdrop}
                  <CueHead index={index} title={item.title} sub={part.sub} />
                  {part.body}
                </section>
              )
            })}

            {/* 마지막: 무대 커튼 너머의 단체 사진(커서 주변만 보임) + ON STAGE로 가는 버튼 */}
            <section className="backstage__finale" aria-label="무대가 준비되었습니다">
              <div
                ref={stage}
                className="backstage__stage"
                onPointerEnter={event => {
                  if (event.pointerType !== 'mouse') return
                  setCurtainHover(true)
                  setHintGone(true)
                }}
                onPointerLeave={event => { if (event.pointerType === 'mouse') setCurtainHover(false) }}
                onPointerDown={event => {
                  if (event.pointerType === 'mouse') return
                  setCurtainHover(true)
                  setHintGone(true)
                  window.clearTimeout(tapTimer.current)
                  tapTimer.current = window.setTimeout(() => setCurtainHover(false), 1600)
                }}
              >
                <div className="backstage__stage-art">
                  {content.stage ? (
                    <img className="backstage__stage-photo" src={content.stage.src} alt={content.stage.alt} data-reveal="" width={content.stage.width} height={content.stage.height} loading="lazy" decoding="async" />
                  ) : (
                    // 단체 사진이 아직 없는 작품: 커튼 뒤에 '사진 자리' 표시만 둡니다.
                    <div className="backstage__stage-photo backstage__stage-photo--todo" data-reveal=""><span>TO DO</span>커튼 뒤 단체 사진</div>
                  )}
                </div>
                <StageCurtain hover={curtainHover} scroller={dialog} />
                <p className="backstage__curtain-hint" data-gone={hintGone} aria-hidden="true">
                  <span className="backstage__curtain-hint-mouse">마우스를 올려보세요 !</span>
                  <span className="backstage__curtain-hint-touch">눌러보세요 !</span>
                </p>
              </div>
              <div className="backstage__finale-body">
                <p>무대가 준비되었습니다.</p>
                {project.url ? (
                  <a className="backstage__onstage" href={project.url} target="_blank" rel="noreferrer">GO ONSTAGE</a>
                ) : (
                  <button className="backstage__onstage" onClick={() => setNotice('완성된 프로젝트 페이지를 준비하고 있어요.')}>GO ONSTAGE</button>
                )}
              </div>
            </section>
          </article>
          {/* 내용을 아직 채우는 중인 작품(content.draft)에만 뜨는 표시 */}
          {content.draft && <p className="backstage__draft" aria-hidden="true"><i />DRAFT · 내용 채우는 중</p>}
        </div>
      )}
      <p className="backstage__toast" role="status" data-visible={notice !== ''}>{notice}</p>
    </dialog>
  )
}
