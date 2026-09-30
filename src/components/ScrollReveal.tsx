/*
 * 문단이 흐릿하게 기울어 있다가, 한 단어씩 또렷해지며 바로 서는 효과 (React Bits Scroll Reveal)
 * 원본: https://reactbits.dev/text-animations/scroll-reveal
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/ScrollReveal
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 원본 기본값 그대로 — 글자 처음 투명도 0.1(baseOpacity), 흐림 4px(blurStrength), 문단 기울기 3도(baseRotation, 왼쪽 가운데 기준),
 *     단어 사이 시차(stagger), 시작 지점 = 문단 윗선이 화면 아래에서 20% 올라온 곳('top bottom-=20%').
 *
 * 원본에서 바꾼 점
 * - 원본은 스크롤한 만큼만 진행돼서(GSAP scrub), 섹션마다 멈추는 스크롤(useSectionSnap)에서 멈춘 자리에 따라
 *   문단이 반쯤 흐린 채로 남을 수 있습니다. 그래서 시작 지점을 지나면 끝까지(모든 단어가 또렷해질 때까지) 이어서 재생합니다.
 *   다시 시작 지점 아래로 스크롤해 내려가면 처음 상태로 돌아가서, 다음에 올라올 때 또 보입니다.
 * - GSAP 없이 CSS 전환(transition)으로 만들었습니다(추가 패키지 없음). 단어마다 늦게 시작하는 시간 = 몇 번째 단어 × stagger.
 * - 글을 단어로 나누는 건 revealWords로 하고, 굵은 글씨(strong) 같은 원래 꾸밈은 그대로 둡니다.
 * - 동작 줄이기 설정이면 처음부터 또렷하게 보입니다.
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import './ScrollReveal.css'

/* baseOpacity : 나타나기 전 글자 진하기(0~1)
   blurStrength: 나타나기 전 흐림(px)
   baseRotation: 나타나기 전 문단 기울기(도)
   duration    : 단어 하나가 또렷해지는 시간(초)
   stagger     : 다음 단어가 늦게 시작하는 시간(초). 클수록 천천히 읽히듯 나타납니다.
   start       : 문단 윗선이 화면 높이의 이 지점(위에서부터 비율)까지 올라오면 시작합니다. 0.8 = 원본의 'top bottom-=20%'. */
export const REVEAL = { baseOpacity: .1, blurStrength: 4, baseRotation: 3, duration: .55, stagger: .025, start: .8 }

export function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)

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
    }, { rootMargin: `0px 0px -${Math.round((1 - REVEAL.start) * 100)}% 0px` })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const style = {
    '--reveal-opacity': REVEAL.baseOpacity,
    '--reveal-blur': `${REVEAL.blurStrength}px`,
    '--reveal-rotate': `${REVEAL.baseRotation}deg`,
    '--reveal-duration': `${REVEAL.duration}s`,
    '--reveal-stagger': `${REVEAL.stagger}s`,
  } as CSSProperties

  return <p ref={ref} className={`scroll-reveal ${className}`.trim()} style={style}>{children}</p>
}

/** 글을 단어 조각으로 나눕니다(띄어쓰기는 그대로). counter는 문단 안에서 몇 번째 단어인지 이어서 셉니다. */
export function revealWords(text: string, counter: { index: number }) {
  return text.split(/(\s+)/).map((piece, index) => {
    if (!piece || /^\s+$/.test(piece)) return piece
    const style = { '--i': counter.index++ } as CSSProperties
    return <span key={index} className="scroll-reveal__word" style={style}>{piece}</span>
  })
}
