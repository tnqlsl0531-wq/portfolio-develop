/*
 * 문단이 흐릿하게 기울어 있다가, 한 단어씩 또렷해지며 바로 서는 효과 (React Bits Scroll Reveal)
 * 원본: https://reactbits.dev/text-animations/scroll-reveal
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/ScrollReveal
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 원본 기본값 그대로 — 글자 처음 투명도 0.1(baseOpacity), 흐림 4px(blurStrength), 묶음 기울기 3도(baseRotation, 왼쪽 가운데 기준).
 *     단어 사이 시차는 묶음 전체가 sweep초 안에 다 또렷해지도록 단어 수에 맞춰 정합니다.
 *
 * 원본에서 바꾼 점
 * - 원본은 스크롤한 만큼만 진행돼서(GSAP scrub) 스크롤을 멈춘 자리에 따라 문단이 반쯤 흐린 채로 남을 수 있습니다.
 *   그래서 묶음이 화면에 보이자마자(아래에서 start만큼 들어오면) 바로 끝까지 이어서 재생합니다(9/30: 예전 '20% 올라온 곳'은 늦다는 피드백).
 *   다시 화면 아래로 내려가면 처음 상태로 돌아가서, 다음에 올라올 때 또 보입니다.
 * - 문단 하나하나가 아니라 묶음(Director’s note 문단 전체) 하나에 겁니다(as="div"로 묶음 요소를 그대로 씀).
 * - GSAP 없이 CSS 전환(transition)으로 만들었습니다(추가 패키지 없음). 단어마다 늦게 시작하는 시간 = 몇 번째 단어 × stagger.
 * - 글을 단어로 나누는 건 revealWords로 하고, 굵은 글씨(strong) 같은 원래 꾸밈은 그대로 둡니다.
 * - 동작 줄이기 설정이면 처음부터 또렷하게 보입니다.
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import './ScrollReveal.css'

/* baseOpacity : 나타나기 전 글자 진하기(0~1)
   blurStrength: 나타나기 전 흐림(px)
   baseRotation: 나타나기 전 문단 기울기(도)
   duration    : 단어 하나가 또렷해지는 시간(초)
   stagger     : 다음 단어가 늦게 시작하는 시간(초)의 최대값. 단어가 많으면 sweep 안에 끝나도록 더 짧아집니다.
   sweep       : 첫 단어부터 마지막 단어가 또렷해지기 시작할 때까지 걸리는 시간(초). 작을수록 빨리 다 보입니다.
   start       : 묶음 윗선이 화면 아래에서 이만큼(화면 높이 대비) 들어오면 시작합니다. 0.05 = 보이자마자. */
export const REVEAL = { baseOpacity: .1, blurStrength: 4, baseRotation: 3, duration: .45, stagger: .025, sweep: 1.1, start: .05 }

export function ScrollReveal({ children, className = '', as: Tag = 'p', words = 0 }: {
  children: ReactNode
  className?: string
  /** 감싸는 요소(문단 하나면 p, 여러 문단 묶음이면 div) */
  as?: 'p' | 'div'
  /** 안에 든 단어 수(revealWords가 센 값). 단어 사이 시차를 맞추는 데 씁니다. */
  words?: number
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.dataset.revealed = 'true'
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) element.dataset.revealed = 'true'
      // 시작 지점 아래로 다시 내려갔을 때만 처음 상태로 돌립니다(위로 지나간 문단은 그대로 또렷하게).
      else if (entry.boundingClientRect.top > 0) delete element.dataset.revealed
    }, { rootMargin: `0px 0px -${Math.round(REVEAL.start * 100)}% 0px` })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const style = {
    '--reveal-opacity': REVEAL.baseOpacity,
    '--reveal-blur': `${REVEAL.blurStrength}px`,
    '--reveal-rotate': `${REVEAL.baseRotation}deg`,
    '--reveal-duration': `${REVEAL.duration}s`,
    '--reveal-stagger': `${Math.min(REVEAL.stagger, words > 1 ? REVEAL.sweep / (words - 1) : REVEAL.stagger).toFixed(4)}s`,
  } as CSSProperties

  const props = { className: `scroll-reveal ${className}`.trim(), style }
  return Tag === 'div'
    ? <div ref={ref as RefObject<HTMLDivElement>} {...props}>{children}</div>
    : <p ref={ref as RefObject<HTMLParagraphElement>} {...props}>{children}</p>
}

/** 글을 단어 조각으로 나눕니다(띄어쓰기는 그대로). counter는 문단 안에서 몇 번째 단어인지 이어서 셉니다. */
export function revealWords(text: string, counter: { index: number }) {
  return text.split(/(\s+)/).map((piece, index) => {
    if (!piece || /^\s+$/.test(piece)) return piece
    const style = { '--i': counter.index++ } as CSSProperties
    return <span key={index} className="scroll-reveal__word" style={style}>{piece}</span>
  })
}
