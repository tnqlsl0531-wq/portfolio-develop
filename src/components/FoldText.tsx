/*
 * 글자가 한 장씩 접혔다 펴지며 나타나는 제목 (React Bits Fold Text)
 * 원본: https://reactbits.dev/text-animations/fold-text
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/FoldText
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 사용자가 준 React Bits 설정 그대로
 *   duration 0.45 · stagger 0.04 · perspective 375 · creaseShading 0.5 · 글자 단위 · 위쪽 경첩
 *
 * 원본에서 바꾼 점
 * - GSAP 대신 CSS 애니메이션으로 옮겼습니다(새로 설치할 패키지 없음).
 *   움직임(위 경첩 기준 -92도 → 0도, 투명 0 → 1, 접힌 자리 그늘 0.5 → 0)과 이징(power3.out = easeOutQuart)은 원본과 같습니다.
 * - 원본 기본값은 페이지가 열리자마자 재생(trigger 'mount')이라, 화면 아래에 있는 제목은 보기도 전에 끝나 버립니다.
 *   그래서 제목이 화면에 들어왔을 때 한 번 재생합니다(원본에도 있는 trigger 'scroll'과 같은 방식).
 * - 글꼴·크기·굵기·자간은 원본이 정하지 않고, 쓰는 쪽(.gallery__title = 피그마 값)을 그대로 따릅니다.
 * - 화면 읽기 프로그램에는 쪼개지 않은 제목을 그대로 읽어 줍니다.
 * - 동작 줄이기 설정이면 처음부터 완성된 모습으로 보여줍니다.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './FoldText.css'

export default function FoldText({
  text,
  duration = .45,
  stagger = .04,
  perspective = 375,
  creaseShading = .5,
}: {
  /** 줄을 나누려면 '\n'을 넣습니다. */
  text: string
  duration?: number
  stagger?: number
  perspective?: number
  creaseShading?: number
}) {
  const root = useRef<HTMLSpanElement>(null)
  const [play, setPlay] = useState(false)

  useEffect(() => {
    const element = root.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlay(true)
      return
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      setPlay(true)
      observer.disconnect()
    }, { threshold: .2 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const style = {
    '--fold-duration': `${duration}s`,
    '--fold-stagger': `${stagger}s`,
    '--fold-perspective': `${perspective}px`,
    '--fold-crease': Math.min(1, Math.max(0, creaseShading)),
  } as CSSProperties

  // 줄바꿈은 세지 않고, 글자에만 순서를 매겨 차례로 펴지게 합니다.
  let order = 0

  return (
    <span ref={root} className="fold-text" data-play={play || undefined} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((char, key) => {
          if (char === '\n') return <br key={`br-${key}`} />
          const index = order++
          return (
            <span className="fold-text__segment" key={key}>
              <span className="fold-text__piece" style={{ '--i': index } as CSSProperties}>
                {char === ' ' ? ' ' : char}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
