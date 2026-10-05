import type { CSSProperties } from 'react'
import { CaptureDeck, IntroClip, Line, StageSetShot } from './parts'
import type { BackstageContent, Capture, Goal, IntroVideo } from './parts'
import castPhoto from '../../assets/backstage/cue01-team.webp'
import captureAbout from '../../assets/backstage/cue02-capture-1.webp'
import captureMain from '../../assets/backstage/cue02-capture-2.webp'
import rehearsalBackdrop from '../../assets/backstage/cue03-backdrop.webp'
import curtainCallBackdrop from '../../assets/backstage/cue06-backdrop.webp'
import finalMain from '../../assets/backstage/cue05-final-main.webp'
import trophy from '../../assets/backstage/award-trophy.svg'
import stagePhoto from '../../assets/backstage/kooksoondang-stage-color.webp'
import introBefore from '../../assets/backstage/kooksoondang-intro-before.webp'
import introAfter from '../../assets/backstage/kooksoondang-intro-after.webp'
import introAfterVideo from '../../assets/backstage/kooksoondang-intro-after.mp4'
import introBeforeVideo from '../../assets/backstage/kooksoondang-intro-before.mp4'

/* 국순당 BACKSTAGE 내용(피그마 426-190 · 447-394).
   ⚠️ 발표 때 칭찬받은 완성본입니다 — 글·사진·순서를 바꾸지 마세요(10/5 사용자: "국순당은 건들지 말 것").
   10/5에 틀과 내용을 나누면서 예전 Backstage.tsx에 있던 내용을 글자 하나 안 바꾸고 그대로 옮겼습니다. */

// CUE 02: 예전 웹사이트 캡처 두 장. 오른쪽 목표 01·02는 첫 번째 캡처의 핀 1·2, 목표 03은 두 번째 캡처의 핀 3과 짝입니다.
const CAPTURES: Capture[] = [
  { src: captureAbout, alt: '리디자인 전 국순당 웹사이트의 회사 소개 화면', height: 696, pins: [{ n: 1, x: 486, y: 187 }, { n: 2, x: 142, y: 400 }] },
  { src: captureMain, alt: '리디자인 전 국순당 웹사이트의 메인 화면', height: 511, pins: [{ n: 3, x: 86, y: 112 }] },
]
const GOALS: Goal[] = [
  { title: '반응형 구성', lines: ['작은 화면과 복잡한 레이아웃으로', '콘텐츠의 가독성과 접근성이 떨어집니다.'], capture: 0 },
  { title: '정보 가독성 개선', lines: ['복잡한 레이아웃과 새 창으로 열리는 메뉴가', '탐색 흐름을 끊어 정보 파악이 어렵습니다.'], capture: 0 },
  { title: '브랜드 개성 전달', lines: ['이미지 위주의 구성이라', '국순당만의 개성이 잘 드러나지 않습니다.'], capture: 1 },
]

// CUE 04: 왼쪽 = 기존 인트로영상, 오른쪽 = 최종 인트로영상(첫 장면이 흰 화면).
const INTRO_VIDEOS: IntroVideo[] = [
  { label: '기존 인트로영상', tag: 'before', poster: introBefore, video: introBeforeVideo },
  { label: '최종 인트로영상', tag: 'after', poster: introAfter, video: introAfterVideo },
]

export const kooksoondangBackstage: BackstageContent = {
  eyebrow: 'BACKSTAGE — PROJECT 02',
  heroMeta: (
    <>
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
    </>
  ),
  cues: {
    // CUE 01 · CAST & CREW: 스크롤하면 플레이빌 카드 뒤에 조금 들어가 있던 사진이 옆으로 스르륵 나옵니다.
    cast: {
      sub: '이번 프로젝트를 소개합니다',
      body: (
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
      ),
    },
    // CUE 02 · SCRIPT READING: 예전 웹사이트 캡처 두 장(카드 교체) + 바꾸려 한 세 가지
    script: {
      sub: '무엇을, 왜 바꾸려 했나',
      body: <CaptureDeck captures={CAPTURES} goals={GOALS} />,
    },
    // CUE 03 · REHEARSAL LOG: 문제 → 해결 타임라인. 기록마다 불이 켜지고, 뒤 사진은 페이지보다 천천히 움직입니다(이 섹션 안에서만).
    log: {
      sub: '문제를 발견하고 해결해 나간 과정',
      backdrop: (
        <figure className="backstage__backdrop backstage__backdrop--log" aria-hidden="true">
          <img src={rehearsalBackdrop} alt="" width={710} height={748} loading="lazy" decoding="async" data-parallax="1.6" />
        </figure>
      ),
      body: (
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
      ),
    },
    // CUE 04 · REHEARSAL → MAIN SHOW: 기존 / 최종 인트로 영상 + 피드백과 방향
    show: {
      sub: '시안에서 최종 화면이 완성되기까지',
      body: (
        <>
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
        </>
      ),
    },
    // CUE 05 · STAGE SET: 최종 메인 화면(긴 캡처를 휠로 내려 보기)
    set: {
      sub: '관객 앞에 선보인 최종 무대',
      body: <StageSetShot shot={finalMain} label="KookSoonDang - Redesign" alt="리디자인한 국순당 웹사이트의 최종 메인 화면 전체" />,
    },
    // CUE 06 · CURTAIN CALL: 한 줄씩 떠오르는 인용문 + 다음 무대
    call: {
      sub: '프로젝트를 마치며',
      backdrop: (
        <figure className="backstage__backdrop backstage__backdrop--call" aria-hidden="true">
          <img src={curtainCallBackdrop} alt="" width={697} height={630} loading="lazy" decoding="async" data-parallax="" />
        </figure>
      ),
      body: (
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
      ),
    },
  },
  stage: { src: stagePhoto, alt: '국순당 팀이 발표 화면 앞에서 함께 박수 치는 모습', width: 1378, height: 1429 },
}
