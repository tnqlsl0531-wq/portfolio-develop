/*
 * 스크롤하면 글자가 하나씩 아래에서 떠오르는 제목 (React Bits Scroll Float)
 * 원본: https://reactbits.dev/text-animations/scroll-float (stagger 0.02)
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/ScrollFloat
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 원본에서 바꾼 점
 * - GSAP(ScrollTrigger) 대신 스크롤 위치로 직접 계산합니다(추가 패키지 없음). 움직임 값·이징·시작/끝 지점은 원본과 같습니다.
 *   글자마다: 투명 0 → 1, 아래로 글자 높이의 120% → 0, 세로 2.3배·가로 0.7배 → 1배(글자 위 가운데 기준),
 *   이징 back.inOut(2), 글자 사이 시차 0.02(FLOAT.stagger)
 *   시작: 제목 가운데가 '화면 아래 끝 + 화면 높이 50%'에 올 때 / 끝: 제목 아래 끝이 '화면 아래 끝 - 화면 높이 40%'에 올 때.
 *   그 사이를 스크롤한 만큼 진행되고, 스크롤을 되돌리면 거꾸로 돌아갑니다(원본의 scrub: true).
 * - 화면 읽기 프로그램에는 쪼개지 않은 제목을 그대로 읽어 줍니다.
 * - 동작 줄이기 설정이면 처음부터 완성된 모습으로 보여줍니다.
 */
import { useEffect, useMemo, useRef } from 'react'
import './ScrollFloat.css'

// duration: 글자 하나가 움직이는 길이, stagger: 다음 글자가 늦게 시작하는 정도(둘 다 원본 GSAP 값과 같은 단위)
const FLOAT = { duration: 1, stagger: 0.02, overshoot: 2 }
// 시작·끝 지점(화면 높이 대비): 시작 = 제목 가운데가 1.5(화면 아래보다 50% 더 아래), 끝 = 제목 아래 끝이 0.6(화면 아래에서 40% 위)
const TRIGGER = { startCenter: 1.5, endBottom: 0.6 }

// GSAP의 back.inOut(2)와 같은 곡선: 살짝 뒤로 갔다가 앞으로 나가고, 끝에서 살짝 넘쳤다가 자리 잡습니다.
const backIn = (p: number) => p * p * ((FLOAT.overshoot + 1) * p - FLOAT.overshoot)
const backInOut = (p: number) => (p < 0.5 ? backIn(p * 2) / 2 : 1 - backIn((1 - p) * 2) / 2)
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export default function ScrollFloat({ text, id, className = '' }: { text: string; id?: string; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const chars = useMemo(() => Array.from(text), [text])

  useEffect(() => {
    const element = heading.current
    if (!element) return
    const pieces = Array.from(element.querySelectorAll<HTMLElement>('.scroll-float__char'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const total = FLOAT.duration + FLOAT.stagger * (pieces.length - 1)
    let frame = 0
    let last = -1

    const render = () => {
      frame = 0
      const viewport = window.innerHeight
      const box = element.getBoundingClientRect()
      const distance = box.height / 2 + (TRIGGER.startCenter - TRIGGER.endBottom) * viewport
      const progress = reduced.matches ? 1 : clamp01((TRIGGER.startCenter * viewport - box.top - box.height / 2) / distance)
      if (progress === last) return
      last = progress
      pieces.forEach((piece, index) => {
        const eased = backInOut(clamp01((progress * total - index * FLOAT.stagger) / FLOAT.duration))
        piece.style.opacity = String(eased)
        piece.style.transform = `translateY(${120 * (1 - eased)}%) scale(${0.7 + 0.3 * eased}, ${2.3 - 1.3 * eased})`
      })
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(render) }

    render()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    reduced.addEventListener('change', request)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      reduced.removeEventListener('change', request)
    }
  }, [chars])

  return (
    <h2 ref={heading} id={id} className={`scroll-float ${className}`}>
      <span className="sr-only">{text}</span>
      <span className="scroll-float__text" aria-hidden="true">
        {chars.map((char, index) => (
          <span className="scroll-float__char" key={index}>{char === ' ' ? ' ' : char}</span>
        ))}
      </span>
    </h2>
  )
}
