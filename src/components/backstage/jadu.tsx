import { Fragment, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { CaptureDeck, Line } from './parts'
import type { BackstageContent, Capture, Goal } from './parts'
import trophy from '../../assets/backstage/jadu/imgHeroiconsTrophy20Solid.svg'
import logTrophy from '../../assets/backstage/jadu/imgHeroiconsTrophy20Solid1.svg'
import teamPhoto from '../../assets/backstage/jadu/imgImg60931.png'
import surveyCard from '../../assets/backstage/jadu/cue02-survey.webp'
import servicesCard from '../../assets/backstage/jadu/cue02-services.webp'
import beforeTree from '../../assets/backstage/jadu/imgBefore.png'
import afterTree from '../../assets/backstage/jadu/imgAfter.png'
import flowLogin from '../../assets/backstage/jadu/log02-login.webp'
import flowSignup from '../../assets/backstage/jadu/log02-signup.webp'
import flowOnboarding from '../../assets/backstage/jadu/log02-onboarding.webp'
import flowHome from '../../assets/backstage/jadu/log02-home.webp'
import fitDesign from '../../assets/backstage/jadu/log03-design.webp'
import fitDevice from '../../assets/backstage/jadu/log03-device.webp'
import teamConflict from '../../assets/backstage/jadu/log04-conflict.webp'
import teamRules from '../../assets/backstage/jadu/log04-rules.webp'
import beforeMonth from '../../assets/backstage/jadu/imgImage.png'
import beforeSpending from '../../assets/backstage/jadu/imgImage1.png'
import beforeFixed from '../../assets/backstage/jadu/imgImage2.png'
import afterDefault from '../../assets/backstage/jadu/imgImage3.png'
import afterCard from '../../assets/backstage/jadu/imgImage4.png'
import stageDots from '../../assets/backstage/jadu/imgDots.svg'
import stageShot from '../../assets/backstage/jadu-cue05-stage.webp'
import stageSheet from '../../assets/backstage/jadu-cue05-sheet.webp'
import stageTab from '../../assets/backstage/jadu-cue05-tabbar.webp'
import chatgpt from '../../assets/backstage/jadu/imgFafafa.png'
import comparisonAi from '../../assets/backstage/jadu/imgFafafa1.png'
import gemini from '../../assets/backstage/jadu/imgGemini1.png'
import claude from '../../assets/backstage/jadu/imgClaude1.png'
import designChatgpt from '../../assets/backstage/jadu/ai2imgFafafa.png'
import midjourney from '../../assets/backstage/jadu/ai2imgFafafa1.png'
import designAi from '../../assets/backstage/jadu/ai2imgFafafa2.png'
import designClaude from '../../assets/backstage/jadu/ai2imgClaude1.png'
import callPhoto from '../../assets/backstage/jadu/img3.png'
import finalePhoto from '../../assets/backstage/jadu/imgImg60943.png'

// Figma 507:185, 1920 × 9969. 움직임은 국순당과 같은 방식(data-appear · --i · 스크롤 훅)으로 켰습니다(10/6).
// 사진 원본은 유지하고 Figma의 이미지 fill/crop을 CSS로 표현합니다.
// CUE 02: 국순당과 같은 카드 2장(parts.tsx의 CaptureDeck). 목표를 누르면 짝인 카드가 앞으로 나옵니다.
// 카드 그림은 피그마 CUE 02 카드 내용(595 × 634)을 2배로 뽑은 것 — 01 설문조사, 02 기존 서비스 비교.
const CAPTURES: Capture[] = [
  { src: surveyCard, alt: '자취생 설문조사 결과: 식비 관리에서 가장 어려운 점과 있었으면 하는 기능', height: 634, pins: [] },
  { src: servicesCard, alt: '기존 서비스 화면 모음: 동네 커뮤니티 · 집 꾸미기 · 생활 서비스 앱', height: 634, pins: [] },
]
const GOALS: Goal[] = [
  { title: '사용자 설문조사', lines: ['자취생의 생활 속 어려움과', '필요한 도움을 파악했습니다.'], capture: 0 },
  { title: '기존 서비스 비교', lines: ['기존 서비스의 기능과 정보 제공 방식을 비교해', '자두야의 기획 방향을 검토했습니다.'], capture: 1 },
]

// ── CUE 03 · REHEARSAL LOG ─────────────────────────────────────────────
// 기록이 다섯 개라 한 화면에 다 들어오지 않아서(10/6), 이 섹션이 화면에 붙어 있는 동안 스크롤하면 기록이 하나씩 켜지고
// 오른쪽 그림이 그 기록의 자료로 바뀝니다. 그림 순서는 피그마 522:754 'cue 03 참고할 것' 그대로입니다:
//   LOG 01 폴더 구조(바닐라 → React) → LOG 02 화면 흐름 → LOG 03 작은 화면 대응 → LOG 04 협업 규칙 → OPENING NIGHT 최우수상
// - 왼쪽 기록: 지금 기록만 다 펼쳐지고, 지나온 기록은 '해결' 한 줄만 남고, 남은 기록은 제목만 흐리게 보입니다.
//   세로선은 스크롤한 만큼 차오릅니다(--seg). 기록을 누르면 그 기록으로 이동합니다.
// - 폰·터치 태블릿에서는 화면에 붙지 않고, 기록 아래에 그림이 하나씩 이어집니다(같은 내용 · jadu.css 맨 아래).
// 값 조절: LOG_STARTS = 각 기록이 켜지는 스크롤 위치(1 = jadu.css의 --log-step, 화면 높이의 44%), LOG_SPAN = 붙어 있는 전체 길이.
const COMPACT = '(max-width: 700px), (max-width: 1200px) and (pointer: coarse)'
const LOG_STARTS = [0, 0.55, 1.55, 2.55, 3.55]
const LOG_SPAN = 4.35

// 그림 안의 조각이 차례로 나타나는 순서(--d). 지금 기록이 될 때마다 다시 차례로 나옵니다.
const pop = (d: number) => ({ '--d': d } as CSSProperties)

function CardArrow({ d, down }: { d: number; down?: boolean }) {
  return <span className="jadu-card__link jadu-pop" style={pop(d)} data-down={down || undefined} aria-hidden="true"><svg viewBox="0 0 16 10"><path d="M.75 5h14.5M11 .9 15.25 5 11 9.1" /></svg></span>
}

// LOG 01: 바닐라 → React 폴더 구조
function StructureCard() {
  return <div className="jadu-development">
    <div className="jadu-development__pair">
      <div className="jadu-development__card jadu-pop" style={pop(0)}><p>BEFORE</p><h4>바닐라 기반</h4><div className="jadu-development__crop jadu-development__crop--before"><img src={beforeTree} alt="바닐라 JavaScript 기반의 초기 프로젝트 폴더 구조" loading="lazy" decoding="async" /></div></div>
      <span className="jadu-development__arrow jadu-pop" style={pop(1)} aria-hidden="true">→</span>
      <div className="jadu-development__card jadu-development__card--after jadu-pop" style={pop(2)}><p>AFTER</p><h4>React 기반</h4><div className="jadu-development__crop jadu-development__crop--after"><img src={afterTree} alt="React 기반으로 재구성한 프로젝트 폴더 구조" loading="lazy" decoding="async" /></div></div>
    </div>
    <p className="jadu-development__note jadu-pop" style={pop(3)}>AI를 활용해 기존 구조를 정리하고 React 기반으로 재구성했습니다.</p>
  </div>
}

// LOG 02: 로그인 → 회원가입 → 온보딩 → 홈이 하나의 흐름으로
const FLOW = [
  { src: flowLogin, label: '로그인' },
  { src: flowSignup, label: '회원가입' },
  { src: flowOnboarding, label: '온보딩' },
  { src: flowHome, label: '홈' },
]
function FlowCard() {
  return <div className="jadu-card jadu-card--flow">
    {FLOW.map((screen, index) => <Fragment key={screen.label}>
      {index > 0 && <CardArrow d={index * 2 - 1} />}
      <div className="jadu-card__shot jadu-pop" style={pop(index * 2)}><img src={screen.src} width={480} height={948} alt={`${screen.label} 화면`} loading="lazy" decoding="async" /><p>{screen.label}</p></div>
    </Fragment>)}
  </div>
}

// LOG 03: 390–402px 기준 설계 → 360px 실기기(작은 쪽 그림은 살짝 큰 크기에서 제 크기로 줄어들며 나옵니다)
function FitCard() {
  return <div className="jadu-card jadu-card--fit">
    <div className="jadu-card__shot jadu-pop" style={pop(0)}><img className="jadu-card__design" src={fitDesign} width={618} height={1329} alt="390–402px 폭으로 설계한 홈 화면" loading="lazy" decoding="async" /><p>390–402px 기준 설계</p></div>
    <CardArrow d={1} />
    <div className="jadu-card__shot jadu-card__shot--point jadu-pop" style={pop(2)}><img className="jadu-card__device" src={fitDevice} width={567} height={1224} alt="360px 실기기에 맞춰 이미지와 여백을 조정한 홈 화면" loading="lazy" decoding="async" /><p>360px 실기기</p></div>
  </div>
}

// LOG 04: 병합 충돌 → 작업 규칙 정리
function TeamCard() {
  return <div className="jadu-card jadu-card--team">
    <div className="jadu-card__shot jadu-pop" style={pop(0)}><img src={teamConflict} width={1680} height={551} alt="공통 파일에서 병합 충돌이 난 커밋 기록" loading="lazy" decoding="async" /><p>병합 충돌</p></div>
    <CardArrow d={1} down />
    <div className="jadu-card__shot jadu-card__shot--point jadu-pop" style={pop(2)}><img src={teamRules} width={1680} height={547} alt="브랜치 이름과 작업 단위를 정한 매일 작업 루틴 문서" loading="lazy" decoding="async" /><p>작업 규칙 정리</p></div>
  </div>
}

// OPENING NIGHT: 최우수상. 수상 사진을 받으면 이 카드 안의 트로피 자리에 사진을 넣으면 됩니다(피그마에도 '사진 아직 못 넣음'으로 비어 있음).
function AwardCard() {
  return <div className="jadu-card jadu-card--award">
    <span className="jadu-card__glow" aria-hidden="true" />
    {[0, 1, 2, 3].map(index => <span key={index} className="jadu-card__spark" aria-hidden="true">✦</span>)}
    <img className="jadu-card__trophy" src={logTrophy} width={96} height={114} alt="" />
    <p className="jadu-card__prize jadu-pop" style={pop(3)}><strong>최우수상</strong><span>프로젝트 전체 부문</span></p>
  </div>
}

type Log = { head: string; color: string; issue?: string; action?: string; label: string; visual: ReactNode }
// color = 기록 동그라미 색(피그마 노드 색: 빨강에서 금빛으로)
const LOGS: Log[] = [
  { head: 'LOG 01', color: '#c9524f', issue: '프로젝트에 맞지 않는 초기 개발 구조', action: 'React 기반으로 개발 환경 재구성', label: '바닐라 기반에서 React 기반으로 바꾼 폴더 구조 비교', visual: <StructureCard /> },
  { head: 'LOG 02', color: '#c9524f', issue: '개별 화면 사이의 연결 필요', action: '사용자 상태와 기능을 하나의 흐름으로 연결', label: '로그인, 회원가입, 온보딩, 홈으로 이어지는 화면 흐름', visual: <FlowCard /> },
  { head: 'LOG 03', color: '#d7775a', issue: '작은 화면에서 레이아웃 대응 필요', action: '360px 실기기 기준으로 이미지·여백 조정', label: '기준 설계 화면과 360px 실기기 화면 비교', visual: <FitCard /> },
  { head: 'LOG 04', color: '#e59f66', issue: '공통 파일 충돌과 작업 통합 문제', action: '브랜치와 배포 방식 재정비', label: '병합 충돌 기록과 그 뒤에 정리한 작업 규칙', visual: <TeamCard /> },
  { head: 'OPENING NIGHT', color: '#fbdd78', label: '프로젝트 전체 부문 최우수상', visual: <AwardCard /> },
]

function RehearsalLog({ head }: { head: ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const jump = useRef<(index: number) => void>(() => {})
  const [step, setStep] = useState(0)
  const [moved, setMoved] = useState(false)
  useEffect(() => {
    const element = track.current
    const stage = element?.querySelector<HTMLElement>('.jadu-logs__stage')
    const scroller = element?.closest('dialog')
    if (!element || !stage || !scroller) return
    const items = [...element.querySelectorAll<HTMLElement>('.jadu-logs__item')]
    const compact = window.matchMedia(COMPACT)
    let raf = 0
    let shown = 0
    // 붙어 있는 구간 길이(range) · 붙는 자리(top) · 한 칸 길이(unit)
    const read = () => {
      const range = element.offsetHeight - stage.offsetHeight
      return { range, top: parseFloat(getComputedStyle(stage).top) || 0, unit: range / LOG_SPAN }
    }
    const measure = () => {
      raf = 0
      if (compact.matches) return
      const { range, top, unit } = read()
      if (range <= 0) return
      const at = Math.min(range, Math.max(0, top - element.getBoundingClientRect().top)) / unit
      let now = 0
      LOG_STARTS.forEach((start, index) => { if (at >= start) now = index })
      // 세로선: 지금 기록에서 다음 기록까지 스크롤한 만큼
      items.forEach((item, index) => {
        const next = LOG_STARTS[index + 1]
        const fill = next === undefined ? 0 : Math.min(1, Math.max(0, (at - LOG_STARTS[index]) / (next - LOG_STARTS[index])))
        item.style.setProperty('--seg', fill.toFixed(3))
      })
      if (now !== shown) {
        shown = now
        setStep(now)
        setMoved(true)
      }
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(measure) }
    jump.current = index => {
      if (compact.matches) return
      const { range, top, unit } = read()
      if (range <= 0) return
      const target = scroller.scrollTop + element.getBoundingClientRect().top - top + (LOG_STARTS[index] + (index ? 0.12 : 0)) * unit
      scroller.scrollTo({ top: target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    const resize = new ResizeObserver(request)
    resize.observe(element)
    scroller.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    request()
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      scroller.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
    }
  }, [])
  return (
    <div ref={track} className="jadu-logs" style={{ '--log-span': LOG_SPAN } as CSSProperties}>
      <div className="jadu-logs__stage">
        {head}
        <ol className="jadu-logs__list" data-appear="">
          {LOGS.map((log, index) => {
            const next = LOGS[index + 1]
            return (
              <li key={log.head} className="jadu-logs__item" data-final={!next || undefined}
                data-state={index < step ? 'done' : index === step ? 'current' : 'todo'}
                style={{ '--node': log.color, '--node-next': next?.color ?? log.color } as CSSProperties}>
                <div className="jadu-logs__entry" onClick={() => jump.current(index)}>
                  {next && <span className="jadu-logs__seg" aria-hidden="true"><i /></span>}
                  <span className="jadu-logs__node" aria-hidden="true" />
                  <div className="jadu-logs__text">
                    <button type="button" className="backstage__log-head jadu-logs__head" aria-current={index === step ? 'step' : undefined}>{log.head}</button>
                    {next ? <>
                      <div className="jadu-logs__fold"><div><p className="backstage__log-issue">{log.issue}</p><p className="backstage__log-arrow" aria-hidden="true">↓</p></div></div>
                      <div className="jadu-logs__fold jadu-logs__fold--keep"><div><p className="backstage__log-action">{log.action}</p></div></div>
                    </> : (
                      <div className="jadu-logs__fold jadu-logs__fold--keep"><div><p className="backstage__log-result">기획부터 구현까지, 하나의 서비스로</p><p className="backstage__log-award">프로젝트 전체 부문 <strong>최우수상</strong> 수상</p></div></div>
                    )}
                  </div>
                </div>
                <figure className="jadu-logs__visual" data-appear="" aria-label={log.label}>{log.visual}</figure>
              </li>
            )
          })}
        </ol>
        <p className="backstage__wheel-hint jadu-logs__hint" data-gone={moved || undefined} aria-hidden="true"><i />스크롤하면 다음 기록이 켜져요</p>
      </div>
    </div>
  )
}

type Phone = { src: string; label: string; imageWidth: number; imageHeight: number; offset?: number }
const BEFORE_PHONES: Phone[] = [
  { src: beforeMonth, label: '이번 달', imageWidth: 234, imageHeight: 720, offset: 230.06 },
  { src: beforeSpending, label: '소비', imageWidth: 234, imageHeight: 694, offset: 150.06 },
  { src: beforeFixed, label: '고정비', imageWidth: 234, imageHeight: 689, offset: 104.06 },
]
const AFTER_PHONES: Phone[] = [
  { src: afterDefault, label: '기본 화면', imageWidth: 180, imageHeight: 785 },
  { src: afterCard, label: '카드 올림', imageWidth: 180, imageHeight: 390 },
]

function PhoneShot({ phone }: { phone: Phone }) {
  const screen = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = screen.current
    if (!element || !phone.offset) return
    const align = () => { element.scrollTop = phone.offset! * element.clientWidth / 180 }
    const observer = new ResizeObserver(align)
    observer.observe(element)
    align()
    return () => observer.disconnect()
  }, [phone.offset])
  return <figure className="jadu-phone">
    <div ref={screen} className="jadu-phone__screen" tabIndex={0} aria-label={`${phone.label} 화면, 위아래로 스크롤해 보기`}>
      <img src={phone.src} alt={`돈 관리 ${phone.label} ${phone.offset ? '초기 시안' : '최종 디자인'}`} loading="lazy" decoding="async" style={{ '--image-w': phone.imageWidth, '--image-h': phone.imageHeight } as CSSProperties} />
    </div>
    <figcaption>{phone.label}</figcaption>
  </figure>
}

// CUE 05: 자두야 사이트 첫 화면 그림(1918 × 958) 위에, 폰 화면 자리에만 '내 메뉴' 시트 그림을 얹어 위아래로 스크롤되게 한 무대.
// 진짜 앱이 아니라 그림 세 장(배경 · 시트 · 탭바)입니다. 실제 앱처럼 시트를 올리면 아래 탭바가 내려가 사라집니다.
// 숫자는 배경 그림 기준 px — screen: 폰 화면 상자, sheetTop: 접힌 시트의 위쪽, tabTop: 탭바 그림의 위쪽.
const STAGE = { w: 1918, h: 958, screen: { x: 786.14, y: 133.45, w: 345.72, h: 751.63 }, sheetTop: 627.94, tabTop: 775.5 }

function PhoneScrollStage() {
  const [up, setUp] = useState(false)
  const [touched, setTouched] = useState(false)
  const { screen } = STAGE
  const box: CSSProperties = { left: `${screen.x / STAGE.w * 100}%`, top: `${screen.y / STAGE.h * 100}%`, width: `${screen.w / STAGE.w * 100}%`, height: `${screen.h / STAGE.h * 100}%` }
  return <figure className="jadu-stage-set" data-appear="" onPointerEnter={() => setTouched(true)}>
    <div className="jadu-stage-set__bar"><img src={stageDots} alt="" /><p>안녕자두야</p><a href="https://jaduya.vercel.app/" target="_blank" rel="noreferrer">실제 앱 열기 ↗</a></div>
    <div className="jadu-stage-set__view">
      <img className="jadu-stage-set__bg" src={stageShot} width={STAGE.w} height={STAGE.h} alt="안녕자두야 데스크톱 첫 화면. 가운데 폰 안에 앱 홈 화면이 보입니다" loading="lazy" decoding="async" draggable={false} />
      <div className="jadu-stage-set__screen" style={box}>
        <div className="jadu-stage-set__scroll" tabIndex={0} aria-label="앱 홈 화면, 위아래로 스크롤해 보기" onScroll={event => { setUp(event.currentTarget.scrollTop > 6); setTouched(true) }}>
          <img src={stageSheet} width={692} height={1292} alt="홈 화면의 내 메뉴와 추천 카드" loading="lazy" decoding="async" draggable={false} style={{ marginTop: `${(STAGE.sheetTop - screen.y) / screen.w * 100}%` }} />
        </div>
        <img className="jadu-stage-set__tab" src={stageTab} width={692} height={219} alt="" aria-hidden="true" data-away={up || undefined} draggable={false} style={{ top: `${(STAGE.tabTop - screen.y) / screen.h * 100}%` }} />
      </div>
    </div>
    <p className="backstage__wheel-hint jadu-stage-set__hint" data-gone={touched || undefined} aria-hidden="true"><i />폰 안에서 스크롤해 보세요</p>
  </figure>
}

type AiLogo = { src: string; label: string; mask?: boolean }
type AiItem = { title: string; text: string; logos: AiLogo[] }
const GPT: AiLogo = { src: chatgpt, label: 'ChatGPT', mask: true }
const GEMINI: AiLogo = { src: gemini, label: 'Gemini' }
const PLANNING: AiItem[] = [
  { title: '자료 탐색', text: 'AI로 1인 가구 관련 통계와 배경 자료를 탐색하고, 프로젝트의 기획 배경을 정리했습니다.', logos: [GPT, GEMINI] },
  { title: '경쟁사 비교', text: 'AI에 당근·뱅크샐러드·숨고의 SWOT 분석을 요청해, 서비스별 차이를 비교했습니다.', logos: [GPT, { src: comparisonAi, label: '비교 분석 AI', mask: true }, GEMINI] },
  { title: '설문 응답 분석', text: 'AI로 수집한 설문 응답의 주요 결과를 정리하고, 사용자에게 필요한 도움을 파악했습니다.', logos: [GPT, { src: claude, label: 'Claude' }] },
]
const DESIGN_GPT: AiLogo = { src: designChatgpt, label: 'ChatGPT', mask: true }
const DESIGN_LOGOS: AiLogo[] = [DESIGN_GPT, { src: designAi, label: '디자인 검토 AI', mask: true }, { src: designClaude, label: 'Claude' }]
// 같은 페이지에 있는 탭 전환 디자인 565:258의 문구·로고입니다.
const DESIGN: AiItem[] = [
  { title: '비주얼 소스 제작', text: '직접 정한 콘셉트에 맞춰 AI로 배경 이미지를 제작하고, 프로젝트 분위기에 맞게 선별했습니다.', logos: [DESIGN_GPT, { src: midjourney, label: 'Midjourney', mask: true }] },
  { title: '디자인 오류 점검', text: '글자 크기·여백·색상 조건을 구체적으로 전달해, 정보 위계와 화면 분위기를 다듬었습니다.', logos: DESIGN_LOGOS },
  { title: 'AI 활용 개발', text: 'AI로 디자인을 검토하며 놓칠 뻔한 오류를 발견하고 수정했습니다.', logos: DESIGN_LOGOS },
]

function AiCrew() {
  const [tab, setTab] = useState(0)
  const tabs = ['기획 · 분석', '디자인 · 개발']
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - tab : null
    if (next === null) return
    event.preventDefault()
    setTab(next)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next].focus()
  }
  return <div className="jadu-ai" data-appear="">
    <div className="jadu-ai__tabs" role="tablist" aria-label="AI 활용 분야" style={{ '--tab': tab } as CSSProperties}>
      {tabs.map((label, index) => <button key={label} type="button" role="tab" id={`jadu-ai-tab-${index}`} aria-selected={tab === index} aria-controls={`jadu-ai-panel-${index}`} tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={keyDown}>{label}</button>)}
      <i className="jadu-ai__ink" aria-hidden="true" />
    </div>
    <div className="jadu-ai__panel" role="tabpanel" id={`jadu-ai-panel-${tab}`} aria-labelledby={`jadu-ai-tab-${tab}`} tabIndex={0} data-design={tab === 1 || undefined}>
      <h4 key={tab}>{tab === 0 ? 'AI로 자료를 탐색하고 분석했습니다' : 'AI를 디자인과 개발에 활용했습니다'}</h4>
      <ol className="jadu-ai__list">{(tab === 0 ? PLANNING : DESIGN).map((item, index) => <li key={item.title} className="jadu-ai__item">
        <div className="jadu-ai__head"><h5><span>{String(index + 1).padStart(2, '0')}</span>{item.title}</h5><div className="jadu-ai__tools"><span>사용한 AI</span><div>{item.logos.map(logo => logo.mask ? <span key={logo.src} role="img" aria-label={logo.label} className="jadu-ai__mask" style={{ maskImage: `url("${logo.src}")` }} /> : <img key={logo.src} src={logo.src} alt={logo.label} loading="lazy" decoding="async" />)}</div></div></div>
        <p>{item.text}</p>
      </li>)}</ol>
    </div>
    <p className="jadu-ai__footnote">프로젝트 제작 과정에서의 AI 활용입니다. 앱 내 ‘자두 AI’ 기능과는 별개입니다.</p>
  </div>
}

export const jaduBackstage: BackstageContent = {
  eyebrow: 'BACKSTAGE  —  PROJECT 01',
  heroTitle: 'AI 챗봇 & 커뮤니티 모바일 웹앱 프로젝트',
  heroMeta: <>
    <p className="backstage__award"><img src={trophy} width={96} height={114} alt="" /><span className="backstage__award-text"><strong>최우수상</strong><small>프로젝트 전체 부문</small></span></p>
    <ul className="backstage__chips"><li>팀 프로젝트</li><li>AI 챗봇 · 커뮤니티 웹앱</li><li>Mobile UX/UI</li></ul>
  </>,
  cues: {
    cast: {
      sub: '이번 프로젝트를 소개합니다',
      body: <div className="backstage__cast">
        <figure className="backstage__cast-photo"><img src={teamPhoto} width={1024} height={1024} alt="안녕자두야 팀 프로젝트 최우수상 수상 단체 사진" loading="lazy" decoding="async" /></figure>
        <article className="backstage__playbill" data-appear="">
          <svg className="backstage__playbill-border" aria-hidden="true"><rect x="0.5" y="0.5" rx="20" /></svg>
          <div className="backstage__playbill-intro"><p className="backstage__kicker">PLAYBILL  ·  NO. 01</p><h4 className="backstage__playbill-title">AI 챗봇 커뮤니티 웹앱 : 안녕자두야</h4><p className="backstage__playbill-text"><Line>AI 챗봇과 커뮤니티로 자취생활을 돕는</Line><Line>모바일 UX/UI 프로젝트입니다.</Line><Line>생활 정보와 복지혜택을 한곳에서 탐색하고,</Line><Line>자신의 상황에 맞는 선택을 돕도록 기획했습니다.</Line></p></div>
          <hr />
          <dl className="backstage__credits"><div><dt>기간</dt><dd>2026.08 ~ 2026.09</dd></div><div><dt>기관</dt><dd>이젠아카데미DX교육센터</dd></div><div><dt>팀원</dt><dd>5명</dd></div></dl>
          <hr />
          <div className="backstage__role"><p className="backstage__kicker">MY ROLE</p><p className="backstage__role-tags"><Line>브랜드 콘셉트  ·  네이밍 제안  ·  AI 챗봇·복지혜택 UI 디자인</Line><Line>  ·  자료 수집  ·  기획서 구성  ·  발표 슬라이드 디자인</Line></p></div>
        </article>
      </div>,
    },
    script: { sub: '무엇을, 왜 만들려 했나', body: <CaptureDeck captures={CAPTURES} goals={GOALS} /> },
    // CUE 03: 화면에 붙어 있는 무대(제목까지 같이 붙어 있어야 해서 layout으로 직접 배치) — 위 RehearsalLog
    log: {
      sub: '문제를 발견하고 해결해 나간 과정',
      body: null,
      layout: head => <RehearsalLog head={head} />,
    },
    show: {
      sub: '시안에서 최종 화면이 완성되기까지',
      body: <>
        <div className="jadu-phones" data-appear=""><div className="jadu-phones__panel"><p>BEFORE · 초기 시안</p><div>{BEFORE_PHONES.map(phone => <PhoneShot key={phone.src} phone={phone} />)}</div></div><span className="jadu-phones__arrow" aria-hidden="true">→</span><div className="jadu-phones__panel jadu-phones__panel--after"><p>AFTER · 최종</p><div>{AFTER_PHONES.map(phone => <PhoneShot key={phone.src} phone={phone} />)}</div></div></div>
        <div className="backstage__notes">
          <div className="backstage__note" data-appear=""><p className="backstage__note-kicker">FEEDBACK</p><h4 className="backstage__note-title">"가독성은 13명 중 8명만"</h4><p className="backstage__note-text"><Line>1차 디자인을 13명에게 보여 주고 반응을 확인했습니다.</Line><Line>현재 레벨 이해와 AI 해결 방식은 92.3%(12명),</Line><Line>메인 탐색은 84.6%(11명)가 긍정적으로 답했습니다.</Line><Line><strong>반면 가독성은 61.5%(8명)로 가장 낮아,</strong></Line><Line>읽기 편한 화면이 가장 큰 숙제로 남았습니다.</Line></p></div>
          <div className="backstage__note" data-appear=""><p className="backstage__note-kicker">DIRECTION</p><h4 className="backstage__note-title">귀여움은 지키고, 정보는 또렷하게</h4><p className="backstage__note-text"><Line>피드백을 바탕으로 네 가지 방향을 잡았습니다.</Line><Line><strong>핵심 기능 재정리 · 사용자 흐름 연결 ·</strong></Line><Line><strong>UI·인터랙션 통일 · 모바일 사용성 개선.</strong></Line><Line>‘자취하는 두더지’의 친근한 분위기는 살리되, 메인부터</Line><Line>모든 화면을 이 기준으로 다시 다듬었습니다.</Line></p></div>
        </div>
      </>,
    },
    set: {
      sub: '관객 앞에 선보인 최종 무대',
      body: <PhoneScrollStage />,
    },
    ai: { sub: '기획부터 구현까지, AI와 함께한 제작 과정', body: <AiCrew /> },
    call: {
      // 원본 화면은 CUE 06, 목차는 CUE 07로 표기되어 있어 그대로 보존합니다.
      no: '06',
      sub: '프로젝트를 마치며',
      backdrop: <div className="jadu-call-photo" aria-hidden="true" data-parallax="0.6"><img src={callPhoto} alt="" loading="lazy" decoding="async" /></div>,
      body: <div className="backstage__call">
        <blockquote className="backstage__quote" data-appear=""><span className="backstage__quote-line" style={{ '--i': 0 } as CSSProperties}>“아이디어를 넘어,</span><span className="backstage__quote-line" style={{ '--i': 1 } as CSSProperties}><em>함께 완성하는 과정</em>을 배웠습니다.”</span></blockquote>
        <p className="backstage__call-text" data-appear=""><Line>서비스 이름과 아이디어를 제안하고 주요 화면과 기획서를 디자인하며,</Line><Line>생각을 구체적인 결과물로 만드는 경험을 했습니다.</Line><Line>의견이 다를 때는 공동의 목표를 돌아보고,</Line><Line>AI의 결과도 직접 판단하고 검토해야 한다는 것을 배웠습니다.</Line><Line>시안과 구현의 차이를 겪으며, 의도를 공유하고 함께 점검하는 일의 중요성을 느꼈습니다.</Line><Line>최우수상이라는 성과와 아쉬움 모두 다음 협업을 위한 기준이 되었습니다.</Line></p>
        <div className="backstage__next" data-appear=""><p className="backstage__kicker backstage__kicker--next">NEXT STAGE</p><ol><li style={{ '--i': 0 } as CSSProperties}><span>01</span>디자인 의도와 구현 기준을 공유하고, 중간 검수 시점 합의하기</li><li style={{ '--i': 1 } as CSSProperties}><span>02</span>공동 목표에 맞춰 핵심 기능과 우선순위부터 정하기</li></ol></div>
      </div>,
    },
  },
  // 마지막 무대: 국순당과 같은 3D 벨벳 커튼(마우스를 올리면 커서 주변만 사진이 보임). 모양·움직임·안내 문구는 공통이고 색만 다릅니다.
  // 커튼 색 = 자두야 빨강(#c9524f)을 깊게 가라앉힌 버건디(와인빛) 벨벳 + 장밋빛 광택 + 앤티크 골드 봉(수상 글자의 금빛 #fbdd78과 같은 계열).
  stage: { src: finalePhoto, alt: '안녕자두야 최우수상 수상팀 단체 사진', width: 1024, height: 1024 },
  curtain: { color: '#47111f', sheen: '#db8f9b', valance: '#330b16', rod: '#b0915a' },
}
