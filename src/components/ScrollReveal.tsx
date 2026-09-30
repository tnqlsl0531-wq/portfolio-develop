/*
 * 문단이 흐릿하게 기울어 있다가, 스크롤해서 화면에 드러나는 만큼 한 단어씩 또렷해지며 바로 서는 효과 (React Bits Scroll Reveal)
 * 원본: https://reactbits.dev/text-animations/scroll-reveal
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/ScrollReveal
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 원본 기본값 그대로 — 글자 처음 투명도 0.1(baseOpacity), 흐림 4px(blurStrength), 묶음 기울기 3도(baseRotation, 왼쪽 가운데 기준).
 *
 * 움직임(9/30 밤, 원본처럼 스크롤한 만큼 진행 = GSAP scrub과 같은 방식으로 되돌림)
 * - 단어마다 '자기 줄이 화면 아래에서 얼마나 올라왔는지'로 또렷해지는 정도가 정해집니다.
 *   줄이 화면 아래 끝에 걸리는 순간 시작해서, 화면 높이의 band만큼 올라오면 다 또렷해집니다.
 *   한 줄 안에서는 왼쪽 단어가 먼저, 오른쪽 단어가 조금 늦게(sweep) 또렷해져서 읽는 방향으로 번져 나갑니다.
 *   → 천천히 스크롤하면 천천히, 멈추면 그 자리에서 멈추고, 되돌리면 다시 흐려집니다.
 *   (그전에는 묶음이 보이자마자 전체가 1초 안에 와르르 재생돼서, 천천히 스크롤하면 이미 끝나 있었다는 피드백)
 * - 기울기는 묶음 전체에 한 번 겁니다: 묶음 윗선이 화면 아래 끝에 닿을 때 3도 → 묶음 아래 끝이 화면 아래 끝에 닿을 때 0도(원본과 같은 구간).
 * - 문단 하나하나가 아니라 묶음(Director’s note 문단 전체) 하나에 겁니다(as="div"로 묶음 요소를 그대로 씀).
 * - GSAP 없이 스크롤 위치로 직접 계산합니다(추가 패키지 없음).
 * - 글을 단어로 나누는 건 revealWords로 하고, 굵은 글씨(strong) 같은 원래 꾸밈은 그대로 둡니다.
 * - 동작 줄이기 설정이면 처음부터 또렷하게 보입니다.
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { onScrollFrame } from './Pin'
import './ScrollReveal.css'

/* baseOpacity : 나타나기 전 글자 진하기(0~1)
   blurStrength: 나타나기 전 흐림(px)
   baseRotation: 나타나기 전 묶음 기울기(도)
   band        : 줄이 화면 아래 끝에서 화면 높이의 이만큼 올라오면 다 또렷해집니다(0~1). 클수록 천천히, 작을수록 빨리.
   sweep       : 한 줄의 오른쪽 끝 단어가 왼쪽 끝보다 늦게 시작하는 정도(band 대비). 0이면 한 줄이 한꺼번에. */
export const REVEAL = { baseOpacity: .1, blurStrength: 4, baseRotation: 3, band: .25, sweep: .5 }

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function ScrollReveal({ children, className = '', as: Tag = 'p' }: {
  children: ReactNode
  className?: string
  /** 감싸는 요소(문단 하나면 p, 여러 문단 묶음이면 div) */
  as?: 'p' | 'div'
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    const parent = element?.parentElement
    if (!element || !parent) return
    const words = Array.from(element.querySelectorAll<HTMLElement>('.scroll-reveal__word'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    // 기울기를 뺀 원래 자리 기준으로 잰 값: 묶음 윗선(부모 윗선에서 얼마나 아래인지)·높이, 단어마다 묶음 윗선에서의 높이와 가로 위치(0~1)
    const layout = { offset: 0, height: 1, tops: new Float32Array(words.length), xs: new Float32Array(words.length) }
    const shown = new Float32Array(words.length).fill(-1)
    let rotation = NaN

    const measure = () => {
      const previous = element.style.transform
      element.style.transform = 'none'
      const box = element.getBoundingClientRect()
      layout.offset = box.top - parent.getBoundingClientRect().top
      layout.height = Math.max(1, box.height)
      words.forEach((word, index) => {
        const rect = word.getBoundingClientRect()
        layout.tops[index] = rect.top - box.top
        layout.xs[index] = clamp01((rect.left - box.left) / Math.max(1, box.width))
      })
      element.style.transform = previous
      shown.fill(-1)
      rotation = NaN
    }

    const render = () => {
      if (reduced.matches) {
        element.dataset.static = ''
        return
      }
      delete element.dataset.static
      const viewport = window.innerHeight
      const top = parent.getBoundingClientRect().top + layout.offset
      // 묶음 기울기: 윗선이 화면 아래 끝 → 아래 끝이 화면 아래 끝
      const turn = REVEAL.baseRotation * (1 - clamp01((viewport - top) / layout.height))
      if (Math.abs(turn - rotation) > .001) {
        rotation = turn
        element.style.transform = turn > 0 ? `rotate(${turn.toFixed(3)}deg)` : 'none'
      }
      const band = Math.max(1, REVEAL.band * viewport)
      for (let index = 0; index < words.length; index++) {
        const raw = (viewport - (top + layout.tops[index])) / band
        const amount = clamp01(raw * (1 + REVEAL.sweep) - REVEAL.sweep * layout.xs[index])
        if (Math.abs(amount - shown[index]) < .004) continue
        shown[index] = amount
        const style = words[index].style
        style.opacity = String(REVEAL.baseOpacity + (1 - REVEAL.baseOpacity) * amount)
        style.filter = amount >= 1 ? 'none' : `blur(${(REVEAL.blurStrength * (1 - amount)).toFixed(2)}px)`
      }
    }

    measure()
    const stop = onScrollFrame(render)
    const resize = new ResizeObserver(() => { measure(); render() })
    resize.observe(element)
    // 글꼴이 늦게 불러와져 줄바꿈이 바뀌면 다시 잽니다.
    document.fonts?.ready.then(() => { measure(); render() })
    return () => {
      stop()
      resize.disconnect()
    }
  }, [])

  const style = {
    '--reveal-opacity': REVEAL.baseOpacity,
    '--reveal-blur': `${REVEAL.blurStrength}px`,
    '--reveal-rotate': `${REVEAL.baseRotation}deg`,
  } as CSSProperties

  const props = { className: `scroll-reveal ${className}`.trim(), style }
  return Tag === 'div'
    ? <div ref={ref as RefObject<HTMLDivElement>} {...props}>{children}</div>
    : <p ref={ref as RefObject<HTMLParagraphElement>} {...props}>{children}</p>
}

/** 글을 단어 조각으로 나눕니다(띄어쓰기는 그대로). counter는 묶음 안에서 몇 번째 단어인지 이어서 셉니다. */
export function revealWords(text: string, counter: { index: number }) {
  return text.split(/(\s+)/).map((piece, index) => {
    if (!piece || /^\s+$/.test(piece)) return piece
    const style = { '--i': counter.index++ } as CSSProperties
    return <span key={index} className="scroll-reveal__word" style={style}>{piece}</span>
  })
}
