import type { CSSProperties } from 'react'
import { Blank, CaptureDeck, ClipsArrow, Line, LiveStage, Todo } from './parts'
import type { BackstageContent, Capture, Goal } from './parts'
import livePoster from '../../assets/backstage/jadu-cue05-poster.webp'

/* 안녕자두야 BACKSTAGE 내용 — 아직 '뼈대'입니다(10/5).
   국순당과 같은 큐시트 틀에 자리만 잡아 둔 상태라서, 내용이 정해지면 이 파일만 채우면 됩니다.
   - <Todo label="..." />  : 사진·영상이 들어갈 자리(점선 상자). 그림이 생기면 <img>나 영상 칸으로 바꿉니다.
   - <Blank>...</Blank>    : 글이 들어갈 자리(점선 밑줄 회색 글자). 글이 정해지면 Blank를 지우고 글만 남깁니다.
   - 다 채우면 맨 아래 draft: true 를 지웁니다(화면 왼쪽 아래 'DRAFT' 표시가 사라짐).
   채우는 법은 ./kooksoondang.tsx(완성본)를 보면 됩니다. 이미 알고 있는 것(기간·기관·팀 프로젝트)은 portfolio.ts에 적힌 대로 넣었습니다. */

// CUE 02: 캡처(또는 기획 자료) 두 장 자리. 그림이 생기면 src를 넣고, 목표와 짝인 핀 자리(pins)를 정합니다.
const CAPTURES: Capture[] = [
  { alt: '첫 번째 그림 (예: 기획 배경 · 리서치 화면)', height: 696, pins: [] },
  { alt: '두 번째 그림 (예: 참고한 서비스 · 초기 구조)', height: 511, pins: [] },
]
const GOALS: Goal[] = [
  { title: <Blank>목표 01 제목</Blank>, lines: [<Blank>왜 필요했는지 한두 줄</Blank>], capture: 0 },
  { title: <Blank>목표 02 제목</Blank>, lines: [<Blank>왜 필요했는지 한두 줄</Blank>], capture: 0 },
  { title: <Blank>목표 03 제목</Blank>, lines: [<Blank>왜 필요했는지 한두 줄</Blank>], capture: 1 },
]

export const jaduBackstage: BackstageContent = {
  eyebrow: 'BACKSTAGE — PROJECT 01',
  // 히어로 제목 아래: 수상이 있으면 국순당처럼 backstage__award를 칩 위에 넣습니다.
  heroMeta: (
    <ul className="backstage__chips">
      <li>팀 프로젝트</li>
      <li>AI 챗봇 · 커뮤니티 웹앱</li>
    </ul>
  ),
  cues: {
    // CUE 01 · CAST & CREW: 팀 사진 + 프로젝트 소개 카드
    cast: {
      sub: '이번 프로젝트를 소개합니다',
      body: (
        <div className="backstage__cast">
          <figure className="backstage__cast-photo">
            <Todo label="팀 사진" hint="정사각형 · 511 × 511" />
            <i className="backstage__cast-shade" aria-hidden="true" />
          </figure>
          <article className="backstage__playbill" data-appear="">
            <svg className="backstage__playbill-border" aria-hidden="true"><rect x="0.5" y="0.5" rx="20" /></svg>
            <div className="backstage__playbill-intro">
              <p className="backstage__kicker">PLAYBILL · NO. 01</p>
              <h4 className="backstage__playbill-title">AI 챗봇 커뮤니티 웹앱 : 안녕자두야</h4>
              <p className="backstage__playbill-text">
                <Line><Blank>어떤 서비스인지 한 줄</Blank></Line>
                <Line><Blank>누구를 위한 것인지 한 줄</Blank></Line>
                <Line><Blank>무엇을 목표로 했는지 한두 줄</Blank></Line>
              </p>
            </div>
            <hr />
            <dl className="backstage__credits">
              <div><dt>기간</dt><dd>2026.08 ~ 2026.09</dd></div>
              <div><dt>기관</dt><dd>이젠아카데미DX교육센터</dd></div>
              <div><dt>팀원</dt><dd><Blank>몇 명</Blank></dd></div>
            </dl>
            <hr />
            <div className="backstage__role">
              <p className="backstage__kicker">MY ROLE</p>
              <p className="backstage__role-tags">
                <Line><Blank>내가 맡은 일 (예: 기획 · 디자인 · 발표)</Blank></Line>
              </p>
            </div>
          </article>
        </div>
      ),
    },
    // CUE 02 · SCRIPT READING: 왜 만들었는지 — 그림 두 장(카드 교체) + 목표 세 가지
    script: {
      sub: '무엇을, 왜 만들려 했나',
      body: <CaptureDeck captures={CAPTURES} goals={GOALS} />,
    },
    // CUE 03 · REHEARSAL LOG: 문제 → 해결 기록 세 개 + 마지막 결과
    log: {
      sub: '문제를 발견하고 해결해 나간 과정',
      body: (
        <ol className="backstage__timeline">
          <li className="backstage__timeline-line" aria-hidden="true"><i /></li>
          <li className="backstage__log" style={{ '--node': '#f29556' } as CSSProperties}>
            <p className="backstage__log-head">LOG 01</p>
            <p className="backstage__log-issue"><Blank>첫 번째 문제</Blank></p>
            <p className="backstage__log-arrow" aria-hidden="true">↓</p>
            <p className="backstage__log-action"><Blank>어떻게 풀었는지</Blank></p>
          </li>
          <li className="backstage__log" style={{ '--node': '#eaa840' } as CSSProperties}>
            <p className="backstage__log-head">LOG 02</p>
            <p className="backstage__log-issue"><Blank>두 번째 문제</Blank></p>
            <p className="backstage__log-arrow" aria-hidden="true">↓</p>
            <p className="backstage__log-action"><Blank>어떻게 풀었는지</Blank></p>
          </li>
          <li className="backstage__log" style={{ '--node': '#e2c127' } as CSSProperties}>
            <p className="backstage__log-head">LOG 03</p>
            <p className="backstage__log-issue"><Blank>세 번째 문제</Blank></p>
            <p className="backstage__log-arrow" aria-hidden="true">↓</p>
            <p className="backstage__log-action"><Blank>어떻게 풀었는지</Blank></p>
          </li>
          <li className="backstage__log backstage__log--final">
            <p className="backstage__log-head">OPENING NIGHT</p>
            <p className="backstage__log-result"><Blank>마지막에 어떻게 마무리됐는지</Blank></p>
          </li>
        </ol>
      ),
    },
    // CUE 04 · REHEARSAL → MAIN SHOW: 시안(BEFORE) → 최종(AFTER) + 피드백과 방향
    show: {
      sub: '시안에서 최종 화면이 완성되기까지',
      body: (
        <>
          <div className="backstage__clips" data-appear="">
            <figure className="backstage__clip">
              <Todo label="처음 시안" hint="영상 또는 그림 · 16:9" />
              <span className="backstage__clip-tag" data-tag="before" aria-hidden="true">BEFORE</span>
            </figure>
            <figure className="backstage__clip">
              <Todo label="최종 화면" hint="영상 또는 그림 · 16:9" />
              <span className="backstage__clip-tag" data-tag="after" aria-hidden="true">AFTER</span>
            </figure>
            <ClipsArrow />
          </div>
          <div className="backstage__notes">
            <div className="backstage__note" data-appear="">
              <p className="backstage__note-kicker">FEEDBACK</p>
              <p className="backstage__note-title"><Blank>받은 피드백 한 줄</Blank></p>
              <p className="backstage__note-text">
                <Line><Blank>어떤 피드백을 받았고</Blank></Line>
                <Line><Blank>그래서 무엇을 바꿨는지 서너 줄</Blank></Line>
              </p>
            </div>
            <div className="backstage__note" data-appear="">
              <p className="backstage__note-kicker">DIRECTION</p>
              <p className="backstage__note-title"><Blank>내가 잡은 방향 한 줄</Blank></p>
              <p className="backstage__note-text">
                <Line><Blank>디자인에서 지키려 한 것</Blank></Line>
                <Line><Blank>직접 해낸 부분 서너 줄</Blank></Line>
              </p>
            </div>
          </div>
        </>
      ),
    },
    // CUE 05 · STAGE SET: 실제 자두야 사이트(데스크톱 화면 = 폰 안에 앱 + 오른쪽 '어떤 자취생활을 시작해볼까요?')를 틀 안에 그대로 띄웁니다(10/6).
    // 폰 안에서 스크롤·클릭이 그대로 되고, 오른쪽에서 생활 유형을 고르고 '이 계정으로 시작하기'를 누르면 앱 홈으로 들어갑니다.
    // poster = 사이트를 불러오기 전(그리고 못 불러올 때) 보이는 그림. 사이트 첫 화면을 1318 × 718로 찍은 것입니다.
    set: {
      sub: '관객 앞에 선보인 최종 무대',
      body: <LiveStage src="https://jaduya.vercel.app/" label="jaduya.vercel.app" poster={livePoster} title="자두야 앱 데모 화면" />,
    },
    // CUE 06 · CURTAIN CALL: 한 줄씩 떠오르는 인용문 + 느낀 점 + 다음 무대
    call: {
      sub: '프로젝트를 마치며',
      body: (
        <div className="backstage__call">
          <blockquote className="backstage__quote" data-appear="">
            <span className="backstage__quote-line" style={{ '--i': 0 } as CSSProperties}><Blank>“이 프로젝트에서</Blank></span>
            <span className="backstage__quote-line" style={{ '--i': 1 } as CSSProperties}><Blank>가장 크게 배운 것</Blank></span>
            <span className="backstage__quote-line" style={{ '--i': 2 } as CSSProperties}><Blank>한 문장.”</Blank></span>
          </blockquote>
          <p className="backstage__call-text" data-appear="">
            <Line><Blank>프로젝트를 하며 느낀 점</Blank></Line>
            <Line><Blank>어려웠던 것과 얻은 것 네댓 줄</Blank></Line>
          </p>
          <div className="backstage__next" data-appear="">
            <p className="backstage__kicker backstage__kicker--next">NEXT STAGE</p>
            <ol>
              <li style={{ '--i': 0 } as CSSProperties}><span>01</span><Blank>다음에 더 잘하고 싶은 것</Blank></li>
              <li style={{ '--i': 1 } as CSSProperties}><span>02</span><Blank>다음에 더 잘하고 싶은 것</Blank></li>
            </ol>
          </div>
        </div>
      ),
    },
  },
  // stage: 커튼 뒤 단체 사진이 생기면 { src, alt, width, height }로 넣습니다.
  draft: true,
}
