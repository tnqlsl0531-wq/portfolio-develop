import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { CaptureDeck, Line } from './parts'
import type { BackstageContent, Capture, Goal } from './parts'
import bulbs from '../../assets/backstage/jadu/imgFrame1707486977.svg'
import trophy from '../../assets/backstage/jadu/imgHeroiconsTrophy20Solid.svg'
import logTrophy from '../../assets/backstage/jadu/imgHeroiconsTrophy20Solid1.svg'
import teamPhoto from '../../assets/backstage/jadu/imgImg60931.png'
import surveyCard from '../../assets/backstage/jadu/cue02-survey.webp'
import servicesCard from '../../assets/backstage/jadu/cue02-services.webp'
import beforeTree from '../../assets/backstage/jadu/imgBefore.png'
import afterTree from '../../assets/backstage/jadu/imgAfter.png'
import logNode1 from '../../assets/backstage/jadu/imgNode.svg'
import logNode2 from '../../assets/backstage/jadu/imgNode1.svg'
import logNode3 from '../../assets/backstage/jadu/imgNode2.svg'
import logNode4 from '../../assets/backstage/jadu/imgNode3.svg'
import openingNode from '../../assets/backstage/jadu/imgNode4.svg'
import beforeMonth from '../../assets/backstage/jadu/imgImage.png'
import beforeSpending from '../../assets/backstage/jadu/imgImage1.png'
import beforeFixed from '../../assets/backstage/jadu/imgImage2.png'
import afterDefault from '../../assets/backstage/jadu/imgImage3.png'
import afterCard from '../../assets/backstage/jadu/imgImage4.png'
import stageDots from '../../assets/backstage/jadu/imgDots.svg'
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
import finaleMask from '../../assets/backstage/jadu/imgImg60942.svg'
import lampOff from '../../assets/backstage/jadu/imgLamp2.svg'
import lampCurrent from '../../assets/backstage/jadu/imgLamp1.svg'

// Figma 507:185, 1920 × 9969. 애니메이션은 다음 단계에서 추가합니다.
// 사진 원본은 유지하고 Figma의 이미지 fill/crop을 CSS로 표현합니다.
const LOGS = [
  { node: logNode1, issue: '프로젝트에 맞지 않는 초기 개발 구조', action: 'React 기반으로 개발 환경 재구성' },
  { node: logNode2, issue: '개별 화면 사이의 연결 필요', action: '사용자 상태와 기능을 하나의 흐름으로 연결' },
  { node: logNode3, issue: '작은 화면에서 레이아웃 대응 필요', action: '360px 실기기 기준으로 이미지·여백 조정' },
  { node: logNode4, issue: '공통 파일 충돌과 작업 통합 문제', action: '브랜치와 배포 방식 재정비' },
]

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

function DevelopmentComparison() {
  return <figure className="jadu-development">
    <div className="jadu-development__pair">
      <div className="jadu-development__card"><p>BEFORE</p><h4>바닐라 기반</h4><div className="jadu-development__crop jadu-development__crop--before"><img src={beforeTree} alt="바닐라 JavaScript 기반의 초기 프로젝트 폴더 구조" loading="lazy" decoding="async" /></div></div>
      <span className="jadu-development__arrow" aria-hidden="true">→</span>
      <div className="jadu-development__card jadu-development__card--after"><p>AFTER</p><h4>React 기반</h4><div className="jadu-development__crop jadu-development__crop--after"><img src={afterTree} alt="React 기반으로 재구성한 프로젝트 폴더 구조" loading="lazy" decoding="async" /></div></div>
    </div>
    <figcaption>AI를 활용해 기존 구조를 정리하고 React 기반으로 재구성했습니다.</figcaption>
  </figure>
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
  return <div className="jadu-ai">
    <div className="jadu-ai__tabs" role="tablist" aria-label="AI 활용 분야">
      {tabs.map((label, index) => <button key={label} type="button" role="tab" id={`jadu-ai-tab-${index}`} aria-selected={tab === index} aria-controls={`jadu-ai-panel-${index}`} tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={keyDown}>{label}</button>)}
    </div>
    <div className="jadu-ai__panel" role="tabpanel" id={`jadu-ai-panel-${tab}`} aria-labelledby={`jadu-ai-tab-${tab}`} tabIndex={0} data-design={tab === 1 || undefined}>
      <h4>{tab === 0 ? 'AI로 자료를 탐색하고 분석했습니다' : 'AI를 디자인과 개발에 활용했습니다'}</h4>
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
  static: true,
  cueLamps: { off: lampOff, current: lampCurrent },
  bulbs: <div className="jadu-bulbs" aria-hidden="true"><img src={bulbs} alt="" /></div>,
  heroMeta: <>
    <p className="backstage__award"><img src={trophy} width={96} height={114} alt="" /><span className="backstage__award-text"><strong>최우수상</strong><small>프로젝트 전체 부문</small></span></p>
    <ul className="backstage__chips"><li>팀 프로젝트</li><li>AI 챗봇 · 커뮤니티 웹앱</li><li>Mobile UX/UI</li></ul>
  </>,
  cues: {
    cast: {
      sub: '이번 프로젝트를 소개합니다',
      body: <div className="backstage__cast">
        <figure className="backstage__cast-photo"><img src={teamPhoto} width={1024} height={1024} alt="안녕자두야 팀 프로젝트 최우수상 수상 단체 사진" loading="lazy" decoding="async" /></figure>
        <article className="backstage__playbill">
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
    log: {
      sub: '문제를 발견하고 해결해 나간 과정',
      backdrop: <DevelopmentComparison />,
      body: <ol className="backstage__timeline">
        <li className="backstage__timeline-line" aria-hidden="true"><i /></li>
        {LOGS.map((log, index) => <li key={log.issue} className="backstage__log"><img className="jadu-log-node" src={log.node} alt="" /><p className="backstage__log-head">LOG {String(index + 1).padStart(2, '0')}</p><p className="backstage__log-issue">{log.issue}</p><p className="backstage__log-arrow" aria-hidden="true">↓</p><p className="backstage__log-action">{log.action}</p></li>)}
        <li className="backstage__log backstage__log--final"><img className="jadu-log-node jadu-log-node--opening" src={openingNode} alt="" /><p className="backstage__log-head">OPENING NIGHT</p><p className="backstage__log-result">기획부터 구현까지, 하나의 서비스로</p><p className="backstage__log-award">프로젝트 전체 부문 <strong>최우수상 </strong>수상</p><img className="backstage__log-trophy" src={logTrophy} alt="" width={96} height={114} /></li>
      </ol>,
    },
    show: {
      sub: '시안에서 최종 화면이 완성되기까지',
      body: <>
        <div className="jadu-phones"><div className="jadu-phones__panel"><p>BEFORE · 초기 시안</p><div>{BEFORE_PHONES.map(phone => <PhoneShot key={phone.src} phone={phone} />)}</div></div><span className="jadu-phones__arrow" aria-hidden="true">→</span><div className="jadu-phones__panel jadu-phones__panel--after"><p>AFTER · 최종</p><div>{AFTER_PHONES.map(phone => <PhoneShot key={phone.src} phone={phone} />)}</div></div></div>
        <div className="backstage__notes">
          <div className="backstage__note"><p className="backstage__note-kicker">FEEDBACK</p><h4 className="backstage__note-title">"가독성은 13명 중 8명만"</h4><p className="backstage__note-text"><Line>1차 디자인을 13명에게 보여 주고 반응을 확인했습니다.</Line><Line>현재 레벨 이해와 AI 해결 방식은 92.3%(12명),</Line><Line>메인 탐색은 84.6%(11명)가 긍정적으로 답했습니다.</Line><Line><strong>반면 가독성은 61.5%(8명)로 가장 낮아,</strong></Line><Line>읽기 편한 화면이 가장 큰 숙제로 남았습니다.</Line></p></div>
          <div className="backstage__note"><p className="backstage__note-kicker">DIRECTION</p><h4 className="backstage__note-title">귀여움은 지키고, 정보는 또렷하게</h4><p className="backstage__note-text"><Line>피드백을 바탕으로 네 가지 방향을 잡았습니다.</Line><Line><strong>핵심 기능 재정리 · 사용자 흐름 연결 ·</strong></Line><Line><strong>UI·인터랙션 통일 · 모바일 사용성 개선.</strong></Line><Line>‘자취하는 두더지’의 친근한 분위기는 살리되, 메인부터</Line><Line>모든 화면을 이 기준으로 다시 다듬었습니다.</Line></p></div>
        </div>
      </>,
    },
    set: {
      sub: '관객 앞에 선보인 최종 무대',
      body: <figure className="jadu-stage-set"><div className="jadu-stage-set__bar"><img src={stageDots} alt="" /><p>안녕자두야</p></div><div className="jadu-stage-set__empty"><p>FINAL · DESKTOP</p><p>최종 화면 캡처가 들어갈 자리</p></div></figure>,
    },
    ai: { sub: '기획부터 구현까지, AI와 함께한 제작 과정', body: <AiCrew /> },
    call: {
      // 원본 화면은 CUE 06, 목차는 CUE 07로 표기되어 있어 그대로 보존합니다.
      no: '06',
      sub: '프로젝트를 마치며',
      backdrop: <div className="jadu-call-photo" aria-hidden="true"><img src={callPhoto} alt="" loading="lazy" decoding="async" /></div>,
      body: <div className="backstage__call">
        <blockquote className="backstage__quote"><span className="backstage__quote-line">“아이디어를 넘어,</span><span className="backstage__quote-line"><em>함께 완성하는 과정</em>을 배웠습니다.”</span></blockquote>
        <p className="backstage__call-text"><Line>서비스 이름과 아이디어를 제안하고 주요 화면과 기획서를 디자인하며,</Line><Line>생각을 구체적인 결과물로 만드는 경험을 했습니다.</Line><Line>의견이 다를 때는 공동의 목표를 돌아보고,</Line><Line>AI의 결과도 직접 판단하고 검토해야 한다는 것을 배웠습니다.</Line><Line>시안과 구현의 차이를 겪으며, 의도를 공유하고 함께 점검하는 일의 중요성을 느꼈습니다.</Line><Line>최우수상이라는 성과와 아쉬움 모두 다음 협업을 위한 기준이 되었습니다.</Line></p>
        <div className="backstage__next"><p className="backstage__kicker backstage__kicker--next">NEXT STAGE</p><ol><li><span>01</span>디자인 의도와 구현 기준을 공유하고, 중간 검수 시점 합의하기</li><li><span>02</span>공동 목표에 맞춰 핵심 기능과 우선순위부터 정하기</li></ol></div>
      </div>,
    },
  },
  finaleArt: <div className="jadu-finale-photo"><img src={finalePhoto} width={1024} height={1024} alt="안녕자두야 최우수상 수상팀 단체 사진" loading="lazy" decoding="async" style={{ maskImage: `url("${finaleMask}")` }} /></div>,
}
