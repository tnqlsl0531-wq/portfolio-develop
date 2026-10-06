import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/* BACKSTAGE 공통 부품 — 작품마다 같이 쓰는 조각들입니다(10/5 공통 틀 분리).
   - 틀(맨 위 줄 · 큐시트 · 섹션 뼈대 · 커튼)은 ../Backstage.tsx
   - 작품별 내용(글 · 사진 · 영상)은 ./kooksoondang.tsx, ./jadu.tsx
   모양은 전부 ../Backstage.css에 있습니다. */

/* 작품 하나의 백스테이지 내용. 큐 제목(CAST & CREW 등)과 큐시트 목록은 틀에 있고, 여기에는 작품마다 다른 것만 넣습니다. */
export type CueKind = 'cast' | 'script' | 'log' | 'show' | 'set' | 'ai' | 'call'
export type CuePart = {
  no?: string // 디자인에서 목차와 다른 번호를 표시할 때
  sub: string // 큐 제목 아래 한 줄 설명
  backdrop?: ReactNode // 섹션 뒤에 깔리는 사진(없어도 됨)
  body: ReactNode // 섹션 내용
}
export type BackstageContent = {
  eyebrow: string // 맨 위 주황 글자(BACKSTAGE — PROJECT 02)
  heroTitle?: string
  bulbs?: ReactNode
  static?: boolean // 레이아웃 구현 단계: 공통 등장·사진·커튼 애니메이션 제외
  cueLamps?: { off: string; current: string }
  finaleArt?: ReactNode
  heroMeta: ReactNode // 히어로 제목 아래(수상 · 칩)
  cues: Record<Exclude<CueKind, 'ai'>, CuePart> & { ai?: CuePart }
  stage?: { src: string; alt: string; width: number; height: number } // 마지막 커튼 뒤 단체 사진
  draft?: boolean // true면 화면 왼쪽 아래에 '내용 채우는 중' 표시가 뜹니다(내용이 다 차면 지우기)
}

// 피그마에서 줄을 나눈 그대로 한 줄씩 씁니다. 폰처럼 좁은 화면에서는 줄바꿈 없이 자연스럽게 이어집니다.
export function Line({ children }: { children: ReactNode }) {
  return <span className="backstage__line">{children}</span>
}

/* 아직 내용이 없는 자리 표시(뼈대 단계에서만 씀).
   Todo = 사진·영상이 들어갈 네모(점선 상자), Blank = 글이 들어갈 자리(점선 밑줄 회색 글자). */
export function Todo({ label, hint, className = '' }: { label: string; hint?: string; className?: string }) {
  return (
    <div className={`backstage__todo ${className}`}>
      <span>TO DO</span>
      <strong>{label}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}
// (span이 아니라 mark로 그립니다 — 카드 번호처럼 'li 안의 span'에 걸린 모양을 물려받지 않게)
export function Blank({ children }: { children: ReactNode }) {
  return <mark className="backstage__blank">{children}</mark>
}

/* ── CUE 02: 캡처 두 장(피그마 447-394 '카드교체') ──────────
   두 장이 카드처럼 겹쳐 있고, 앞 카드를 누르거나 브라우저 줄의 '01 / 02 ›'를 누르면 앞 카드가 왼쪽으로 빠져 뒤로 들어가고
   뒤 카드가 앞으로 나옵니다. 삐져나온 뒤 카드를 직접 눌러도 앞으로 나옵니다(10/1, 다들 뒤 카드를 누르게 돼서).
   목표마다 capture(몇 번째 캡처와 짝인지)를 적어 두면, 목표 위에 마우스를 올릴 때 짝인 핀이 퍼져 나가며 반짝이고,
   목표를 누르면 그 핀이 있는 캡처로 바뀝니다. 핀 번호 n은 목표 순서(1부터)와 같게 씁니다.
   src가 없는 캡처는 '빈 자리' 상자로 보입니다(뼈대 단계). */
export type Capture = { src?: string; alt: string; height: number; pins: { n: number; x: number; y: number }[] }
export type Goal = { title: ReactNode; lines: ReactNode[]; capture: number }
// 카드 교체 움직임 시간(ms) — Backstage.css의 backstage-card-tuck과 같게
const SWAP_MS = 760

export function CaptureDeck({ captures, goals }: { captures: Capture[]; goals: Goal[] }) {
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
  const frontHeight = captures[front].height
  return (
    <div className="backstage__script" data-appear="">
      <div className="backstage__deck" style={{ '--deck-h': captures[0].height } as CSSProperties}>
        {captures.map((capture, index) => {
          const pose = index === front ? 'front' : index === leaving ? 'leaving' : 'back'
          // 뒤 카드는 앞 카드보다 아래로 삐져나오지 않게 앞 카드 높이만큼만 보여 줍니다.
          const clip = pose === 'front' ? 0 : Math.max(0, capture.height - frontHeight)
          return (
            <figure key={capture.src ?? index} className="backstage__capture" data-pose={pose}
              style={{ '--clip': clip } as CSSProperties} aria-hidden={pose !== 'front'}
              onClick={pose === 'back' ? () => show(index) : undefined}>
              <div className="backstage__browser-bar">
                <i /><i /><i />
                <button type="button" className="backstage__deck-next" tabIndex={pose === 'front' ? 0 : -1}
                  onClick={() => show((front + 1) % captures.length)} aria-label="다음 캡처 보기">
                  <span>{String(index + 1).padStart(2, '0')}</span> / {String(captures.length).padStart(2, '0')}
                  <svg viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1.5 6 6l-4.5 4.5" /></svg>
                </button>
              </div>
              <button type="button" className="backstage__capture-shot" tabIndex={-1}
                onClick={() => pose === 'front' && show((front + 1) % captures.length)}>
                {capture.src ? (
                  <img src={capture.src} alt={capture.alt} width={595} height={capture.height} loading="lazy" decoding="async" />
                ) : (
                  <span className="backstage__capture-todo" style={{ '--h': capture.height } as CSSProperties}>
                    <Todo label={capture.alt} hint={`595 × ${capture.height}`} />
                  </span>
                )}
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
        {goals.map((goal, index) => (
          <li key={index} className="backstage__goal" data-linked={goal.capture === front || undefined}
            style={{ '--i': index } as CSSProperties}>
            <button type="button" onClick={() => show(goal.capture)}
              onPointerEnter={() => setHot(index)} onPointerLeave={() => setHot(null)}
              onFocus={() => setHot(index)} onBlur={() => setHot(null)}>
              <span className="backstage__goal-no">{String(index + 1).padStart(2, '0')}</span>
              <span className="backstage__goal-text">
                <strong>{goal.title}</strong>
                <span>{goal.lines.map((line, at) => <Line key={at}>{line}</Line>)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── CUE 04: 영상 한 칸 ──────────────────────────
   썸네일을 누르면 그 자리에서 재생되고(재생·멈춤·전체화면 버튼 표시), 끝나면 다시 썸네일로 돌아옵니다.
   poster = 영상 첫 장면 그림. tag = 영상 왼쪽 위 BEFORE / AFTER 표시(10/1: 전후 비교가 한눈에 보이게). */
export type IntroVideo = { label: string; tag: 'before' | 'after'; poster: string; video: string }

export function IntroClip({ item }: { item: IntroVideo }) {
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

/* 두 영상 사이의 주황 화살표 동그라미(.backstage__clips 안, 영상 두 칸 다음에 둡니다). */
export function ClipsArrow() {
  return (
    <span className="backstage__clips-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M4 12h15M13 5.5 19.5 12 13 18.5" /></svg>
    </span>
  )
}

/* ── CUE 05: 최종 화면 — 긴 캡처를 브라우저 틀 안에서 마우스 휠(터치는 손가락)로 직접 내려 봅니다 ──
   틀 끝까지 내리면 그다음부터는 페이지가 이어서 내려갑니다. 오른쪽에 얇은 스크롤 막대, 처음에는 '휠을 굴려 둘러보세요' 안내가 떠 있다가
   한 번 굴리면 사라집니다. shot(긴 캡처 그림)이 아직 없으면 안내만 보입니다. label = 브라우저 줄 가운데 글자. */
export function StageSetShot({ shot, label, alt, emptyText = '최종 메인 화면을 준비하고 있어요' }: {
  shot?: string
  label: string
  alt: string
  emptyText?: string
}) {
  const [used, setUsed] = useState(false)
  return (
    <figure className="backstage__stage-set" data-empty={!shot || undefined} data-appear="">
      <div className="backstage__browser-bar backstage__browser-bar--wide">
        <i /><i /><i />
        <p className="backstage__url">{label}</p>
      </div>
      <div className="backstage__stage-set-view" tabIndex={shot ? 0 : undefined} aria-label={shot ? '최종 메인 화면(휠로 내려 보기)' : undefined}
        onScroll={used ? undefined : () => setUsed(true)}>
        {shot ? (
          <img src={shot} alt={alt} loading="lazy" decoding="async" />
        ) : (
          <p className="backstage__stage-set-empty"><span>FINAL · DESKTOP</span>{emptyText}</p>
        )}
      </div>
      {shot && <p className="backstage__wheel-hint" data-gone={used || undefined} aria-hidden="true"><i />휠을 굴려 둘러보세요</p>}
    </figure>
  )
}

/* ── CUE 05(앱·웹 서비스용): 실제 사이트를 브라우저 틀 안에 그대로 띄웁니다 ──
   국순당처럼 긴 캡처를 내려 보는 대신, 진짜 사이트(src)를 iframe으로 넣어서 틀 안에서 스크롤·클릭이 그대로 됩니다.
   - 섹션이 화면에 30% 넘게 들어왔을 때 처음 불러옵니다(그 전에는 poster 그림만 보여서 페이지가 무거워지지 않음).
     사이트가 안 열리는 상황(오프라인·주소 변경)에서도 poster는 그대로 남습니다.
   - 사이트는 width × height(기본 1318 × 718) 크기의 화면이라고 생각하고 그려진 뒤, 틀 폭에 맞춰 통째로 줄어듭니다(--live-scale).
   - 폰·터치 태블릿에서는 틀이 너무 작아서 사이트를 띄우지 않고, poster + '앱 열기' 버튼만 보여 줍니다.
   label = 브라우저 줄 가운데 글자, hint = 틀 아래쪽에 잠깐 떠 있는 안내(마우스를 올리면 사라짐). */
export function LiveStage({ src, label, poster, title, width = 1318, height = 718, hint = '직접 눌러 보고 스크롤해 보세요' }: {
  src: string
  label: string
  poster: string
  title: string
  width?: number
  height?: number
  hint?: string
}) {
  const view = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    const element = view.current
    if (!element) return
    // 틀 폭에 맞춰 사이트를 통째로 줄이는 비율
    const fit = () => element.style.setProperty('--live-scale', String(element.clientWidth / width))
    const resize = new ResizeObserver(fit)
    resize.observe(element)
    fit()
    const compact = window.matchMedia('(max-width: 700px), (max-width: 1200px) and (pointer: coarse)')
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || compact.matches) return
      setLive(true)
      observer.disconnect()
    }, { threshold: 0.3 })
    observer.observe(element)
    return () => {
      resize.disconnect()
      observer.disconnect()
    }
  }, [width])
  return (
    <figure className="backstage__stage-set backstage__stage-set--live" data-appear="" onPointerEnter={() => setTouched(true)}>
      <div className="backstage__browser-bar backstage__browser-bar--wide">
        <i /><i /><i />
        <p className="backstage__url">{label}</p>
        <a className="backstage__live-open" href={src} target="_blank" rel="noreferrer">새 창에서 열기 ↗</a>
      </div>
      <div ref={view} className="backstage__live-view" style={{ '--live-w': width, '--live-h': height } as CSSProperties}>
        <img className="backstage__live-poster" src={poster} alt={title} loading="lazy" decoding="async" />
        {live && (
          <iframe className="backstage__live-frame" src={src} title={title} data-loaded={loaded || undefined}
            onLoad={() => setLoaded(true)} />
        )}
        <a className="backstage__live-mobile" href={src} target="_blank" rel="noreferrer">앱 열기 ↗</a>
      </div>
      <p className="backstage__wheel-hint backstage__live-hint" data-gone={touched || undefined} aria-hidden="true"><i />{hint}</p>
    </figure>
  )
}
