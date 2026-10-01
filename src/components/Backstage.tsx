import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import type { Project } from '../portfolio'
import ProjectCover from './ProjectCover'
import StageCurtain from './StageCurtain'
import { useColorReveal } from '../hooks/useColorReveal'
import castPhoto from '../assets/backstage/cue01-team.webp'
import captureAbout from '../assets/backstage/cue02-capture-1.webp'
import captureMain from '../assets/backstage/cue02-capture-2.webp'
import rehearsalBackdrop from '../assets/backstage/cue03-backdrop.webp'
import curtainCallBackdrop from '../assets/backstage/cue06-backdrop.webp'
import finalMain from '../assets/backstage/cue05-final-main.webp'
import trophy from '../assets/backstage/award-trophy.svg'
import stagePhoto from '../assets/backstage/kooksoondang-stage-color.webp'
import introBefore from '../assets/backstage/kooksoondang-intro-before.webp'
import introAfter from '../assets/backstage/kooksoondang-intro-after.webp'
import introAfterVideo from '../assets/backstage/kooksoondang-intro-after.mp4'
import introBeforeVideo from '../assets/backstage/kooksoondang-intro-before.mp4'
import './Backstage.css'

/* BACKSTAGE 페이지 — 큐시트 구조(피그마 426-190, 10/1 교체): 작품 선택 화면의 BACKSTAGE를 누르면 열리는 어두운 페이지입니다.
   공연 큐시트처럼 CUE 00(막 오르기 전) → CUE 06(커튼콜) 순서로 내려가고, 맨 끝에 무대 커튼 + GO ONSTAGE가 있습니다.
   - 주소 끝에 #backstage-작품이름 이 붙어서, 브라우저 '뒤로 가기'를 누르면 원래 화면으로 돌아옵니다.
   - 맨 위 줄('← 돌아가기' · '기획서 보러가기')은 스크롤하면 화면 맨 위에 붙어 있습니다(sticky, 뒤 흐림).
   - 왼쪽 큐시트(CueSheet)는 화면에 고정돼 있고, 스크롤해도 움직이지 않습니다(10/1 완전 고정). 지금 섹션의 램프가 켜집니다.
   - 섹션별 움직임 값은 아래 MOTION에서 조절합니다. 기획서 주소는 portfolio.ts의 planUrl, GO ONSTAGE는 url입니다. */

// 백스테이지 페이지가 있는 작품. 자두야는 기획 화면이 완성되면 추가합니다.
const BACKSTAGE_PROJECTS: Project['id'][] = ['kooksoondang']
export const hasBackstage = (id: Project['id']) => BACKSTAGE_PROJECTS.includes(id)

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

// 큐시트 목록(피그마 427:1043). 섹션 순서와 같습니다.
const CUES = [
  { no: '00', label: '막 오르기 전' },
  { no: '01', label: '캐스트 & 크루' },
  { no: '02', label: '대본 리딩' },
  { no: '03', label: '리허설 일지' },
  { no: '04', label: '리허설 → 본공연' },
  { no: '05', label: '무대 세트' },
  { no: '06', label: '커튼콜' },
]

// 피그마에서 줄을 나눈 그대로 한 줄씩 씁니다. 폰처럼 좁은 화면에서는 줄바꿈 없이 자연스럽게 이어집니다.
function Line({ children }: { children: ReactNode }) {
  return <span className="backstage__line">{children}</span>
}

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

/* ── CUE 02: 예전 웹사이트 캡처 두 장(피그마 447-394 '카드교체') ──────────
   두 장이 카드처럼 겹쳐 있고, 앞 카드를 누르거나 브라우저 줄의 '01 / 02 ›'를 누르면 앞 카드가 왼쪽으로 빠져 뒤로 들어가고
   뒤 카드가 앞으로 나옵니다. 삐져나온 뒤 카드를 직접 눌러도 앞으로 나옵니다(10/1, 다들 뒤 카드를 누르게 돼서). 오른쪽 목표 01·02는 첫 번째 캡처의 핀 1·2, 목표 03은 두 번째 캡처의 핀 3과 짝입니다.
   목표 위에 마우스를 올리면 짝인 핀이 퍼져 나가며 반짝이고, 목표를 누르면 그 핀이 있는 캡처로 바뀝니다. */
type Capture = { src: string; alt: string; height: number; pins: { n: number; x: number; y: number }[] }
const CAPTURES: Capture[] = [
  { src: captureAbout, alt: '리디자인 전 국순당 웹사이트의 회사 소개 화면', height: 696, pins: [{ n: 1, x: 486, y: 187 }, { n: 2, x: 142, y: 400 }] },
  { src: captureMain, alt: '리디자인 전 국순당 웹사이트의 메인 화면', height: 511, pins: [{ n: 3, x: 86, y: 112 }] },
]
const GOALS = [
  { title: '반응형 구성', lines: ['작은 화면과 복잡한 레이아웃으로', '콘텐츠의 가독성과 접근성이 떨어집니다.'], capture: 0 },
  { title: '정보 가독성 개선', lines: ['복잡한 레이아웃과 새 창으로 열리는 메뉴가', '탐색 흐름을 끊어 정보 파악이 어렵습니다.'], capture: 0 },
  { title: '브랜드 개성 전달', lines: ['이미지 위주의 구성이라', '국순당만의 개성이 잘 드러나지 않습니다.'], capture: 1 },
]
// 카드 교체 움직임 시간(ms) — Backstage.css의 backstage-card-tuck과 같게
const SWAP_MS = 760

function CaptureDeck() {
  const [front, setFront] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const [hot, setHot] = useState<number | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const show = useCallback((next: number) => {
    setFront(current => {
      if (current === next) return current
      setLeaving(current)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setLeaving(null), SWAP_MS)
      return next
    })
  }, [])
  const frontHeight = CAPTURES[front].height
  return (
    <div className="backstage__script" data-appear="">
      <div className="backstage__deck" style={{ '--deck-h': CAPTURES[0].height } as CSSProperties}>
        {CAPTURES.map((capture, index) => {
          const pose = index === front ? 'front' : index === leaving ? 'leaving' : 'back'
          // 뒤 카드는 앞 카드보다 아래로 삐져나오지 않게 앞 카드 높이만큼만 보여 줍니다.
          const clip = pose === 'front' ? 0 : Math.max(0, capture.height - frontHeight)
          return (
            <figure key={capture.src} className="backstage__capture" data-pose={pose}
              style={{ '--clip': clip } as CSSProperties} aria-hidden={pose !== 'front'}
              onClick={pose === 'back' ? () => show(index) : undefined}>
              <div className="backstage__browser-bar">
                <i /><i /><i />
                <button type="button" className="backstage__deck-next" tabIndex={pose === 'front' ? 0 : -1}
                  onClick={() => show((front + 1) % CAPTURES.length)} aria-label="다음 캡처 보기">
                  <span>{String(index + 1).padStart(2, '0')}</span> / {String(CAPTURES.length).padStart(2, '0')}
                  <svg viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1.5 6 6l-4.5 4.5" /></svg>
                </button>
              </div>
              <button type="button" className="backstage__capture-shot" tabIndex={-1}
                onClick={() => pose === 'front' && show((front + 1) % CAPTURES.length)}>
                <img src={capture.src} alt={capture.alt} width={595} height={capture.height} loading="lazy" decoding="async" />
                {capture.pins.map(pin => (
                  <span key={pin.n} className="backstage__pin" data-hot={hot === pin.n - 1 || undefined}
                    style={{ '--x': pin.x, '--y': pin.y, '--d': pin.n } as CSSProperties}>{pin.n}</span>
                ))}
              </button>
            </figure>
          )
        })}
      </div>
      <ol className="backstage__goals">
        {GOALS.map((goal, index) => (
          <li key={goal.title} className="backstage__goal" data-linked={goal.capture === front || undefined}
            style={{ '--i': index } as CSSProperties}>
            <button type="button" onClick={() => show(goal.capture)}
              onPointerEnter={() => setHot(index)} onPointerLeave={() => setHot(null)}
              onFocus={() => setHot(index)} onBlur={() => setHot(null)}>
              <span className="backstage__goal-no">{String(index + 1).padStart(2, '0')}</span>
              <span className="backstage__goal-text">
                <strong>{goal.title}</strong>
                <span>{goal.lines.map(line => <Line key={line}>{line}</Line>)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── CUE 04: 인트로 영상 두 칸 ──────────────────────────
   썸네일을 누르면 그 자리에서 재생되고(재생·멈춤·전체화면 버튼 표시), 끝나면 다시 썸네일로 돌아옵니다.
   poster = 영상 첫 장면 그림. 왼쪽 = 기존 인트로영상, 오른쪽 = 최종 인트로영상(첫 장면이 흰 화면).
   10/1: 전후 비교가 한눈에 보이게 영상 왼쪽 위에 BEFORE / AFTER 표시, 두 영상 사이에 주황 화살표 동그라미를 둡니다. */
type IntroVideo = { label: string; tag: 'before' | 'after'; poster: string; video: string }
const INTRO_VIDEOS: IntroVideo[] = [
  { label: '기존 인트로영상', tag: 'before', poster: introBefore, video: introBeforeVideo },
  { label: '최종 인트로영상', tag: 'after', poster: introAfter, video: introAfterVideo },
]

function IntroClip({ item }: { item: IntroVideo }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const play = () => {
    setPlaying(true)
    // 재생이 안 되는 브라우저면 다시 썸네일로 돌아갑니다.
    video.current?.play().catch(() => setPlaying(false))
  }
  return (
    <figure className="backstage__clip">
      <video ref={video} src={item.video} poster={item.poster} controls={playing} playsInline preload="metadata"
        aria-label={item.label} onEnded={() => setPlaying(false)} />
      {!playing && (
        <button className="backstage__clip-thumb" onClick={play} aria-label={`${item.label} 재생`}>
          <img src={item.poster} alt="" loading="lazy" decoding="async" />
          <span className="backstage__play" aria-hidden="true" />
        </button>
      )}
      <span className="backstage__clip-tag" data-tag={item.tag} aria-hidden="true">{item.tag.toUpperCase()}</span>
    </figure>
  )
}

/* ── CUE 05: 최종 메인 화면 — 긴 캡처를 브라우저 틀 안에서 마우스 휠(터치는 손가락)로 직접 내려 봅니다 ──
   틀 끝까지 내리면 그다음부터는 페이지가 이어서 내려갑니다. 오른쪽에 얇은 스크롤 막대, 처음에는 '휠을 굴려 둘러보세요' 안내가 떠 있다가
   한 번 굴리면 사라집니다. 캡처가 아직 없으면 안내만 보입니다. */
function StageSetShot({ shot }: { shot?: string }) {
  const [used, setUsed] = useState(false)
  return (
    <figure className="backstage__stage-set" data-empty={!shot || undefined} data-appear="">
      <div className="backstage__browser-bar backstage__browser-bar--wide">
        <i /><i /><i />
        <p className="backstage__url">KookSoonDang - Redesign</p>
      </div>
      <div className="backstage__stage-set-view" tabIndex={shot ? 0 : undefined} aria-label={shot ? '최종 메인 화면(휠로 내려 보기)' : undefined}
        onScroll={used ? undefined : () => setUsed(true)}>
        {shot ? (
          <img src={shot} alt="리디자인한 국순당 웹사이트의 최종 메인 화면 전체" loading="lazy" decoding="async" />
        ) : (
          <p className="backstage__stage-set-empty"><span>FINAL · DESKTOP</span>최종 메인 화면을 준비하고 있어요</p>
        )}
      </div>
      {shot && <p className="backstage__wheel-hint" data-gone={used || undefined} aria-hidden="true"><i />휠을 굴려 둘러보세요</p>}
    </figure>
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
      {project && (
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
                <p className="backstage__eyebrow">BACKSTAGE — PROJECT 02</p>
                <div className="backstage__marquee">
                  <div className="backstage__bulbs" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map(index => <i key={index} style={{ '--i': index } as CSSProperties} />)}
                  </div>
                  <ProjectCover project={project} className="backstage__hero-cover" />
                </div>
              </div>
              <div className="backstage__hero-info">
                <h2 id="backstage-title" className="backstage__hero-title">{project.title}</h2>
                <div className="backstage__hero-meta">
                  <p className="backstage__award">
                    <img src={trophy} width={96} height={114} alt="" />
                    <span className="backstage__award-text">
                      <strong>최우수상</strong>
                      <small><Line>비주얼 크래프트,</Line><Line>인터랙션 디자인 부문</Line></small>
                    </span>
                  </p>
                  <ul className="backstage__chips">
                    <li>팀 프로젝트</li>
                    <li>UX/UI · 반응형 웹</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* CUE 01 · CAST & CREW: 스크롤하면 플레이빌 카드 뒤에 숨어 있던(60px만 보이던) 사진이 옆으로 스르륵 나옵니다. */}
            <section className="backstage__cue backstage__cue--cast" data-cue="1" aria-labelledby="backstage-cue-1">
              <CueHead index={1} title="CAST & CREW" sub="이번 프로젝트를 소개합니다" />
              <div className="backstage__cast">
                <figure className="backstage__cast-photo">
                  <img src={castPhoto} alt="국순당 팀이 모니터 앞에서 함께 작업하는 모습" width={511} height={511} loading="lazy" decoding="async" />
                  <i className="backstage__cast-shade" aria-hidden="true" />
                </figure>
                <article className="backstage__playbill" data-appear="">
                  {/* 안쪽 점선 테두리(피그마 inner border: 1px #4c3b33, 점선 4·4, 모서리 20) */}
                  <svg className="backstage__playbill-border" aria-hidden="true"><rect x="0.5" y="0.5" rx="20" /></svg>
                  <div className="backstage__playbill-intro">
                    <p className="backstage__kicker">PLAYBILL · NO. 02</p>
                    <h4 className="backstage__playbill-title">K-브랜드 리디자인 : 국순당</h4>
                    <p className="backstage__playbill-text">
                      <Line>전통주 브랜드 국순당의 웹사이트를 새롭게 해석한</Line>
                      <Line>K- 브랜드 리디자인 프로젝트입니다.</Line>
                      <Line>반응형 구성과 정보 가독성을 개선하고,</Line>
                      <Line>브랜드의 개성을 시각적으로 전달하는 것을 목표로 했습니다.</Line>
                    </p>
                  </div>
                  <hr />
                  <dl className="backstage__credits">
                    <div><dt>기간</dt><dd>2026.05 ~ 2026.08</dd></div>
                    <div><dt>기관</dt><dd>이젠아카데미DX교육센터</dd></div>
                    <div><dt>팀원</dt><dd>6명으로 시작 → 최종 4명<small> (2명 중도하차)</small></dd></div>
                  </dl>
                  <hr />
                  <div className="backstage__role">
                    <p className="backstage__kicker">MY ROLE</p>
                    <p className="backstage__role-tags">
                      <Line>기획서 작성<b> · </b>자료 수집<b> · </b>일부 페이지 디자인</Line>
                      <Line><b>· </b>발표자료 수집<b> · </b>아이디어 제안 등</Line>
                    </p>
                  </div>
                </article>
              </div>
            </section>

            {/* CUE 02 · SCRIPT READING: 예전 웹사이트 캡처 두 장(카드 교체) + 바꾸려 한 세 가지 */}
            <section className="backstage__cue backstage__cue--script" data-cue="2" aria-labelledby="backstage-cue-2">
              <CueHead index={2} title="SCRIPT READING" sub="무엇을, 왜 바꾸려 했나" />
              <CaptureDeck />
            </section>

            {/* CUE 03 · REHEARSAL LOG: 문제 → 해결 타임라인. 선이 스크롤한 만큼 차오르며 기록마다 불이 켜지고,
                뒤 사진은 페이지보다 천천히 움직입니다(이 섹션 안에서만). */}
            <section className="backstage__cue backstage__cue--log" data-cue="3" aria-labelledby="backstage-cue-3">
              <figure className="backstage__backdrop backstage__backdrop--log" aria-hidden="true">
                <img src={rehearsalBackdrop} alt="" width={710} height={748} loading="lazy" decoding="async" data-parallax="1.6" />
              </figure>
              <CueHead index={3} title="REHEARSAL LOG" sub="문제를 발견하고 해결해 나간 과정" />
              <ol className="backstage__timeline">
                <li className="backstage__timeline-line" aria-hidden="true"><i /></li>
                <li className="backstage__log" style={{ '--node': '#f29556' } as CSSProperties}>
                  <p className="backstage__log-head">LOG 01</p>
                  <p className="backstage__log-issue">의견 조율이 어려워 일정이 지연됨</p>
                  <p className="backstage__log-arrow" aria-hidden="true">↓</p>
                  <p className="backstage__log-action">우선순위를 다시 정리하고, 일부 작업의 방향을 재설정</p>
                </li>
                <li className="backstage__log" style={{ '--node': '#eaa840' } as CSSProperties}>
                  <p className="backstage__log-head">LOG 02</p>
                  <p className="backstage__log-issue">팀 작업 도중, 팀원 1명 중도하차</p>
                  <p className="backstage__log-arrow" aria-hidden="true">↓</p>
                  <p className="backstage__log-action">남은 팀원들과 역할을 빠르게 재분담</p>
                </li>
                <li className="backstage__log" style={{ '--node': '#e2c127' } as CSSProperties}>
                  <p className="backstage__log-head">LOG 03</p>
                  <p className="backstage__log-issue">최종 발표 직전, 기획 및 PM 담당자 이탈</p>
                  <p className="backstage__log-arrow" aria-hidden="true">↓</p>
                  <p className="backstage__log-action"><Line>기획 자료를 다시 조사 · 재구성하고,</Line><Line>기획 의도를 지킬 근거와 해결 방향을 구체적으로 제안</Line></p>
                </li>
                <li className="backstage__log backstage__log--final">
                  <p className="backstage__log-head">OPENING NIGHT</p>
                  <p className="backstage__log-result">최종 발표까지 안정적으로 완성</p>
                  <p className="backstage__log-award">&gt; 비주얼 크래프트, 인터랙션 디자인 부문 <strong>최우수상</strong> 수상</p>
                  <img className="backstage__log-trophy" src={trophy} width={96} height={114} alt="" />
                </li>
              </ol>
            </section>

            {/* CUE 04 · REHEARSAL → MAIN SHOW: 기존 / 최종 인트로 영상 + 피드백과 방향 */}
            <section className="backstage__cue backstage__cue--show" data-cue="4" aria-labelledby="backstage-cue-4">
              <CueHead index={4} title="REHEARSAL → MAIN SHOW" sub="시안에서 최종 화면이 완성되기까지" />
              <div className="backstage__clips" data-appear="">
                {INTRO_VIDEOS.map(item => <IntroClip item={item} key={item.label} />)}
                <span className="backstage__clips-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M4 12h15M13 5.5 19.5 12 13 18.5" /></svg>
                </span>
              </div>
              <div className="backstage__notes">
                <div className="backstage__note" data-appear="">
                  <p className="backstage__note-kicker">FEEDBACK</p>
                  <p className="backstage__note-title">"본문 전에 지루해질 수 있다"</p>
                  <p className="backstage__note-text">
                    <Line>초기 인트로는 손그림 일러스트와 분위기 있는 장면으로 호기심을</Line>
                    <Line>유도했지만, 본문에 진입하기 전 전개가 지루해 이탈할 수 있다는</Line>
                    <Line>피드백을 받았습니다. 이에 애니메이션의 움직임과 장면 전환으로</Line>
                    <Line>시선을 자연스럽게 이끌고, <strong>시각적 흥미가 다음 장면에 대한</strong></Line>
                    <Line><strong>기대감으로 이어지도록</strong> 수정했습니다.</Line>
                  </p>
                </div>
                <div className="backstage__note" data-appear="">
                  <p className="backstage__note-kicker">DIRECTION</p>
                  <p className="backstage__note-title">AI 대신, 직접 그리고 코딩하다</p>
                  <p className="backstage__note-text">
                    <Line>색상과 로고, 타이포그래피를 조화롭게 구성해 국순당의 개성을</Line>
                    <Line>드러내고, 브랜드의 첫인상이 분명하게 전달되도록 했습니다.</Line>
                    <Line>또한 AI로 영상을 생성하는 대신, <strong>직접 그린 일러스트와 코딩을</strong></Line>
                    <Line><strong>활용해</strong> 의도한 장면과 움직임을 세밀하게 조정하며 구현했습니다.</Line>
                  </p>
                </div>
              </div>
            </section>

            {/* CUE 05 · STAGE SET: 최종 메인 화면(긴 캡처가 저절로 천천히 스크롤) */}
            <section className="backstage__cue backstage__cue--set" data-cue="5" aria-labelledby="backstage-cue-5">
              <CueHead index={5} title="STAGE SET" sub="관객 앞에 선보인 최종 무대" />
              <StageSetShot shot={finalMain} />
            </section>

            {/* CUE 06 · CURTAIN CALL: 한 줄씩 떠오르는 인용문('서로의 강점'에 불이 켜짐) + 다음 무대 */}
            <section className="backstage__cue backstage__cue--call" data-cue="6" aria-labelledby="backstage-cue-6">
              <figure className="backstage__backdrop backstage__backdrop--call" aria-hidden="true">
                <img src={curtainCallBackdrop} alt="" width={697} height={630} loading="lazy" decoding="async" data-parallax="" />
              </figure>
              <CueHead index={6} title="CURTAIN CALL" sub="프로젝트를 마치며" />
              <div className="backstage__call">
                <blockquote className="backstage__quote" data-appear="">
                  <span className="backstage__quote-line" style={{ '--i': 0 } as CSSProperties}>“협업은</span>
                  <span className="backstage__quote-line" style={{ '--i': 1 } as CSSProperties}><em>서로의 강점</em>을 배우고,</span>
                  <span className="backstage__quote-line" style={{ '--i': 2 } as CSSProperties}>빈틈을 함께 채워가는 일이었습니다.”</span>
                </blockquote>
                <p className="backstage__call-text" data-appear="">
                  <Line>프로젝트 후반 예상치 못한 팀원 이탈로 작업을 다시 나누고,</Line>
                  <Line>짧은 시간 안에 부족한 부분을 함께 보완해야 했습니다.</Line>
                  <Line>쉽지 않은 과정이었지만 각자의 강점을 빠르게 살려 역할을 재정비했고,</Line>
                  <Line>서로의 작업 방식과 디자인 관점을 공유하며 완성도를 높여갔습니다.</Line>
                  <Line>특히 뛰어난 팀원들과 협업하며 디자인적으로 많은 것을 배우고,</Line>
                  <Line>위기 상황에서도 함께 해결해 나가는 팀의 힘을 경험했습니다.</Line>
                </p>
                <div className="backstage__next" data-appear="">
                  <p className="backstage__kicker backstage__kicker--next">NEXT STAGE</p>
                  <ol>
                    <li style={{ '--i': 0 } as CSSProperties}><span>01</span>중간 마감과 진행 상황을 공유해 변수를 더 빠르게 파악하기</li>
                    <li style={{ '--i': 1 } as CSSProperties}><span>02</span>서로의 강점과 작업 방식을 공유하며 팀의 완성도를 높이기</li>
                  </ol>
                </div>
              </div>
            </section>

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
                  <img className="backstage__stage-photo" src={stagePhoto} alt="국순당 팀이 발표 화면 앞에서 함께 박수 치는 모습" data-reveal="" width={1378} height={1429} loading="lazy" decoding="async" />
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
        </div>
      )}
      <p className="backstage__toast" role="status" data-visible={notice !== ''}>{notice}</p>
    </dialog>
  )
}
