import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { Project } from '../portfolio'
import ProjectCover from './ProjectCover'
import StageCurtain from './StageCurtain'
import { useColorReveal } from '../hooks/useColorReveal'
import photo1 from '../assets/backstage/kooksoondang-photo-1.webp'
import photo2 from '../assets/backstage/kooksoondang-photo-2.webp'
import photo3 from '../assets/backstage/kooksoondang-photo-3.webp'
import stagePhoto from '../assets/backstage/kooksoondang-stage-color.webp'
import introBefore from '../assets/backstage/kooksoondang-intro-before.webp'
import introAfter from '../assets/backstage/kooksoondang-intro-after.webp'
import introAfterVideo from '../assets/backstage/kooksoondang-intro-after.mp4'
import introBeforeVideo from '../assets/backstage/kooksoondang-intro-before.mp4'
import './Backstage.css'

/* BACKSTAGE 페이지 (피그마 96-516): 작품 선택 화면의 BACKSTAGE를 누르면 열리는 어두운 페이지입니다.
   - 주소 끝에 #backstage-작품이름 이 붙어서, 브라우저 '뒤로 가기'를 누르면 원래 화면으로 돌아옵니다.
   - '기획서 보러가기' 줄은 스크롤하다 화면 맨 위에 닿으면 그 자리에 붙어 있습니다(sticky).
   - 배경사진 1·2·3은 페이지보다 천천히 스크롤됩니다(패럴랙스, 아래 PARALLAX).
   - 기획서 주소는 portfolio.ts의 planUrl, GO ONSTAGE는 url에 넣으면 새 창으로 열립니다. 비어 있으면 준비 중 안내가 뜹니다.
   - 영상 두 칸(기존/최종 인트로영상)은 눌러서 재생하는 영상입니다. 영상 파일이 없는 칸은 첫 장면 그림만 보입니다(아래 INTRO_VIDEOS). */

// 백스테이지 페이지가 있는 작품. 자두야는 기획 화면이 완성되면 추가합니다.
const BACKSTAGE_PROJECTS: Project['id'][] = ['kooksoondang']
export const hasBackstage = (id: Project['id']) => BACKSTAGE_PROJECTS.includes(id)

// 인트로 영상 두 칸: 썸네일을 누르면 그 자리에서 재생되고(재생·멈춤·전체화면 버튼 표시), 끝나면 다시 썸네일로 돌아옵니다.
// - poster: 영상 첫 장면 그림(영상이 없을 때 썸네일, 재생 직후 첫 장면이 뜨기 전 잠깐 보이는 그림)
// - video: 영상 파일(src/assets/backstage). 기존 인트로영상은 피그마에 올라간 영상(848×464, 9초)을 받아 소리 없이 mp4로 옮겼습니다.
// - projectCover: true면 썸네일로 흰 작품 카드(피그마 296-254, 작품 선택 화면과 같은 카드)를 보여줍니다.
type IntroVideo = { label: string; poster: string; video?: string; projectCover?: boolean; current?: boolean }
const INTRO_VIDEOS: IntroVideo[] = [
  { label: '기존 인트로영상', poster: introBefore, video: introBeforeVideo },
  { label: '최종 인트로영상', poster: introAfter, video: introAfterVideo, projectCover: true, current: true },
]

function IntroClip({ item, project }: { item: IntroVideo; project: Project }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const thumbnail = item.projectCover
    ? <ProjectCover project={project} className="backstage__clip-cover" />
    : <img src={item.poster} alt="" loading="lazy" decoding="async" />
  const play = () => {
    setPlaying(true)
    // 재생이 안 되는 브라우저면 다시 썸네일로 돌아갑니다.
    video.current?.play().catch(() => setPlaying(false))
  }
  return (
    <figure className={`backstage__clip${item.current ? ' backstage__clip--current' : ''}`}>
      <div className="backstage__clip-frame">
        {item.video && (
          <video
            ref={video}
            src={item.video}
            poster={item.poster}
            controls={playing}
            playsInline
            preload="metadata"
            aria-label={item.label}
            onEnded={() => setPlaying(false)}
          />
        )}
        {!playing && (item.video ? (
          <button className="backstage__clip-thumb" onClick={play} aria-label={`${item.label} 재생`}>
            {thumbnail}
            <span className="backstage__play" aria-hidden="true" />
          </button>
        ) : (
          <div className="backstage__clip-thumb" role="img" aria-label={`${item.label} 첫 장면`}>{thumbnail}</div>
        ))}
      </div>
      <figcaption>{item.label}</figcaption>
    </figure>
  )
}

// 피그마에서 줄을 나눈 그대로 한 줄씩 씁니다. 폰처럼 좁은 화면에서는 줄바꿈 없이 자연스럽게 이어집니다.
function Line({ children }: { children: ReactNode }) {
  return <span className="backstage__line">{children}</span>
}

/* 배경사진 패럴랙스(레퍼런스: 피그마 307-319)
   사진이 페이지 스크롤 속도의 65%로 천천히 움직입니다(데스크톱 0.35 = 35%만큼 뒤처짐, 폰·터치 0.2).
   사진 가운데가 화면 가운데에 올 때 피그마에 놓은 자리와 정확히 같고, 그 전후로 천천히 따라옵니다.
   숫자를 키우면 더 느리게(더 많이 뒤처지게), 0이면 효과 없음.
   사진마다 data-parallax(배율)를 주면 그 사진만 따로 조절됩니다. 사진3은 0.6배:
   더 크게 뒤처지면 앞 문단('시안에서 최종 화면이 완성되기까지')을 읽는 동안 미리 올라와 보이기 때문입니다. */
const PARALLAX = { desktop: 0.35, touch: 0.2 }

function useBackstageParallax(dialog: RefObject<HTMLDialogElement | null>, isOpen: boolean) {
  useEffect(() => {
    const scroller = dialog.current
    if (!scroller || !isOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const touch = window.matchMedia('(max-width: 700px), (max-width: 1200px) and (pointer: coarse)')
    let frame = 0
    const update = () => {
      frame = 0
      const page = scroller.querySelector<HTMLElement>('.backstage__page')
      if (!page) return
      const speed = touch.matches ? PARALLAX.touch : PARALLAX.desktop
      const viewCenter = scroller.scrollTop + scroller.clientHeight / 2
      for (const photo of page.querySelectorAll<HTMLElement>('.backstage__photo')) {
        // offsetTop은 transform(움직인 양)과 상관없는 원래 자리입니다.
        const center = page.offsetTop + photo.offsetTop + photo.offsetHeight / 2
        const scale = Number(photo.dataset.parallax ?? 1)
        photo.style.setProperty('--parallax', `${((viewCenter - center) * speed * scale).toFixed(1)}px`)
      }
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(update) }
    request()
    scroller.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
    }
  }, [dialog, isOpen])
}

export default function Backstage({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [notice, setNotice] = useState('')
  const isOpen = project !== null
  useBackstageParallax(dialog, isOpen)
  // 마지막 단체 사진 + 무대 커튼
  // - 벨벳 커튼 한 벌(봉·가림막·커튼 두 폭)이 동그란 단체 사진을 늘 덮고 있습니다.
  // - 마우스를 올리면 히어로와 같은 커서 효과: 커서 주변 원(사진 크기의 32%) 안에서만 커튼 너머 단체 사진(원래 색, 피그마 217-1474)이 보이고,
  //   커튼은 아주 살짝 찰랑거립니다. 터치 기기는 누른 자리에 원이 나타났다가 1.5초 뒤 사라집니다.
  const stage = useRef<HTMLDivElement>(null)
  useColorReveal(stage, stage, 0.32, isOpen, { touch: true })
  const [curtainHover, setCurtainHover] = useState(false)
  // 커튼 가운데 안내 문구(피그마 333-808): 처음 마우스를 올리면(터치는 누르면) 천천히 사라지고, 페이지를 닫기 전까지 다시 나오지 않습니다.
  const [hintGone, setHintGone] = useState(false)
  const tapTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(tapTimer.current), [])
  useEffect(() => {
    if (isOpen) return
    setCurtainHover(false)
    setHintGone(false)
  }, [isOpen])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (isOpen && !element.open) {
      element.showModal()
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

  return (
    <dialog
      ref={dialog}
      className="backstage"
      aria-labelledby="backstage-title"
      onCancel={event => { event.preventDefault(); onClose() }}
    >
      <button className="backstage__close" onClick={onClose}>돌아가기 ×</button>
      {project && (
        <div className="backstage__frame">
          <article className="backstage__page">
            <div className="backstage__glow" aria-hidden="true" />

            {/* 맨 위: 작품 카드가 아래로 갈수록 검정 배경에 스며듭니다. */}
            <header className="backstage__cover">
              <h2 id="backstage-title" className="sr-only">{project.title} 백스테이지 · 기획 의도와 작업 과정</h2>
              <ProjectCover project={project} className="backstage__cover-card" />
              <div className="backstage__cover-fade" aria-hidden="true" />
            </header>

            {/* 기획서 보러가기: 이 줄이 화면 맨 위에 닿으면 그 자리에 붙어 있습니다. */}
            <div className="backstage__bar-track">
              <div className="backstage__bar">
                {project.planUrl ? (
                  <a className="backstage__plan" href={project.planUrl} target="_blank" rel="noreferrer">기획서 보러가기</a>
                ) : (
                  <button className="backstage__plan" onClick={() => setNotice('기획서 링크를 준비하고 있어요.')}>기획서 보러가기</button>
                )}
              </div>
            </div>

            <figure className="backstage__photo backstage__photo--1">
              <img src={photo1} alt="국순당 팀이 모니터 앞에서 함께 작업하는 모습" width={1038} height={1040} loading="lazy" decoding="async" />
            </figure>
            <section className="backstage__section backstage__section--intro" aria-labelledby="backstage-intro">
              <h3 id="backstage-intro" className="backstage__title">이번 프로젝트를 소개합니다</h3>
              <div className="backstage__intro-body">
                <p className="backstage__text">
                  <Line>전통주 브랜드 국순당의 웹사이트를 새롭게 해석한</Line>
                  <Line>K브랜드 리디자인 프로젝트입니다.</Line>
                  <Line>반응형 구성과 정보 가독성을 개선하고,</Line>
                  <Line>브랜드의 개성을 시각적으로 전달하는 것을 목표로 했습니다.</Line>
                </p>
                <dl className="backstage__facts">
                  <div><dt>기간</dt><dd>2026.05 - 2026.08</dd></div>
                  <div><dt>팀원</dt><dd>6명으로 시작, 최종 4명</dd></div>
                  <div>
                    <dt>담당</dt>
                    <dd><Line>기획서 작성, 자료 수집, 일부 페이지 디자인,</Line><Line>발표자료 수집 및 아이디어 제안</Line></dd>
                  </div>
                </dl>
              </div>
            </section>

            <figure className="backstage__photo backstage__photo--2">
              <img src={photo2} alt="국순당 팀이 화면을 보며 회의하는 모습" width={890} height={1000} loading="lazy" decoding="async" />
            </figure>
            <section className="backstage__section backstage__section--summary" aria-labelledby="backstage-summary">
              <h3 id="backstage-summary" className="backstage__title">문제를 발견하고 해결해 나간 과정</h3>
              <p className="backstage__text">
                <Line>기존 웹사이트는 복잡한 레이아웃으로 정보 파악이 어려웠으며,</Line>
                <Line>새 창으로 열리는 메뉴가 탐색 흐름을 끊고 있었습니다.</Line>
                <Line>이미지 중심 콘텐츠와 반응형 미지원 역시</Line>
                <Line>모바일·해외 환경에서의 이용을 어렵게 했습니다.</Line>
                <Line>이를 개선하기 위해 정보의 우선순위가 드러나는 화면 구성과</Line>
                <Line>자연스러운 페이지 이동, 반응형 설계를 중심으로</Line>
                <Line>사용자가 다양한 기기에서 필요한 정보를 쉽게 탐색할 수 있도록</Line>
                <Line>방향을 설정했습니다.</Line>
                <Line>여기에 <strong>일러스트와 인트로 모션</strong>으로 국순당의 개성을 더하고,</Line>
                <Line>전통주·음식 페어링 인터랙션을 통해 어울리는 음식을 살펴보며</Line>
                <Line>브랜드를 흥미롭게 경험하도록 구성했습니다.</Line>
              </p>
            </section>

            <section className="backstage__section backstage__section--process" aria-labelledby="backstage-process">
              <h3 id="backstage-process" className="backstage__title">시안에서 최종 화면이 완성되기까지</h3>
              <div className="backstage__process-body">
                <div className="backstage__media">
                  {INTRO_VIDEOS.map(item => <IntroClip item={item} project={project} key={item.label} />)}
                </div>
                <div className="backstage__text backstage__process-text">
                  <p>
                    <Line>초기 인트로는 손그림 일러스트와 분위기 있는 장면으로 호기심을 유도했지만,</Line>
                    <Line>본문에 진입하기 전 전개가 지루해 이탈할 수 있다는 피드백을 받았습니다.</Line>
                    <Line>이에 애니메이션의 움직임과 장면 전환으로 시선을 자연스럽게 이끌고,</Line>
                    <Line><strong>시각적 흥미가 다음 장면에 대한 기대감으로 이어지도록</strong> 수정했습니다.</Line>
                  </p>
                  <p>
                    <Line>색상과 로고, 타이포그래피를 조화롭게 구성해 국순당의 개성을 드러내고,</Line>
                    <Line>브랜드의 첫인상이 분명하게 전달되도록 했습니다.</Line>
                    <Line>또한 AI로 영상을 생성하는 대신, <strong>직접 그린 일러스트와 코딩을 활용</strong>해</Line>
                    <Line>의도한 장면과 움직임을 세밀하게 조정하며 구현했습니다.</Line>
                    <Line>이 과정을 통해 표현 의도를 구체화하고,</Line>
                    <Line><strong>사용자가 다음 화면을 궁금해하도록 만드는 도입부</strong>에 집중했습니다.</Line>
                  </p>
                </div>
              </div>
            </section>

            <figure className="backstage__photo backstage__photo--3" data-parallax="0.6">
              <img src={photo3} alt="국순당 팀이 작업 화면을 함께 확인하는 모습" width={994} height={898} loading="lazy" decoding="async" />
            </figure>
            <section className="backstage__section backstage__section--lessons" aria-labelledby="backstage-lessons">
              <h3 id="backstage-lessons" className="backstage__title">프로젝트를 마치며 ..</h3>
              <p className="backstage__text">
                <Line>팀원이 줄어든 상황에서 미완료 작업이 마무리 단계에 몰리면서,</Line>
                <Line>제한된 시간 안에 기존 업무와 추가 작업을 함께 처리해야 했습니다.</Line>
                <Line>이 과정에서 업무를 재분담하고 일정을 조정하며,</Line>
                <Line>역할과 시간을 구체적으로 조율하는 협업의 중요성을 배웠습니다.</Line>
                <Line>다음 프로젝트에서는 작업별 담당자와 중간 마감일을</Line>
                <Line>명확히 정하고 진행 상황을 자주 공유해,</Line>
                <Line>지연되는 작업을 일찍 파악하고 조정하고자 합니다.</Line>
              </p>
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
