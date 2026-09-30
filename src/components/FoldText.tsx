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
 * - pinDriven(9/30 밤): 섹션이 화면에 멈추는(Pin) 순간부터, 멈춰 있는 동안 스크롤한 만큼 접혔다 펴집니다(멈춘 거리의 pinShare 지점에서 완성).
 *   멈추기 전에는 글자가 안 보이고, 스크롤을 되돌리면 거꾸로 접힙니다. 글자 사이 시차·한 글자 길이·이징 비율은 위 설정 그대로이고
 *   '초' 대신 '스크롤 거리'로 진행될 뿐입니다. 화면 고정을 안 하는 기기(폰·동작 줄이기)에서는 원래처럼 보일 때 한 번 재생합니다.
 * - 글꼴·크기·굵기·자간은 원본이 정하지 않고, 쓰는 쪽(.gallery__title = 피그마 값)을 그대로 따릅니다.
 * - 접힐 때 지는 그늘(creaseShading)을 글자 모양에만 입힙니다. 원본은 글자 둘레 네모 칸 전체를 어둡게 해서(어두운 배경용),
 *   밝은 배경인 우리 페이지에서는 글자 뒤에 회색 네모가 보였습니다(9/30 밤).
 * - 화면 읽기 프로그램에는 쪼개지 않은 제목을 그대로 읽어 줍니다.
 * - 동작 줄이기 설정이면 처음부터 완성된 모습으로 보여줍니다.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { onScrollFrame, pinProgress } from './Pin'
import './FoldText.css'

// GSAP power3.out(= easeOutQuart)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export default function FoldText({
  text,
  duration = .45,
  stagger = .04,
  perspective = 375,
  creaseShading = .5,
  pinDriven = false,
  pinShare = .7,
}: {
  /** 줄을 나누려면 '\n'을 넣습니다. */
  text: string
  duration?: number
  stagger?: number
  perspective?: number
  creaseShading?: number
  /** 섹션이 화면에 멈춰 있는 동안 스크롤한 만큼 펴지게 합니다(Pin 안에서만). */
  pinDriven?: boolean
  /** pinDriven일 때, 멈춰 있는 거리 중 이 비율(0~1)만큼 스크롤하면 다 펴집니다. */
  pinShare?: number
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

  // pinDriven: 멈춰 있는 동안 스크롤한 거리를 '시간'처럼 써서 글자마다 접힌 정도를 직접 정합니다.
  useEffect(() => {
    const element = root.current
    if (!element || !pinDriven) return
    const pieces = Array.from(element.querySelectorAll<HTMLElement>('.fold-text__piece'))
    const total = duration + stagger * Math.max(0, pieces.length - 1)
    const crease = clamp01(creaseShading)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let last = NaN
    return onScrollFrame(() => {
      const progress = reduced.matches ? null : pinProgress(element)
      if (progress === null) {
        // 화면 고정이 없으면 원래 방식(보일 때 한 번 재생)으로 돌려놓습니다.
        if (element.dataset.scrub === undefined) return
        delete element.dataset.scrub
        pieces.forEach(piece => { piece.style.opacity = ''; piece.style.transform = ''; piece.style.removeProperty('--fold-crease-now') })
        last = NaN
        return
      }
      element.dataset.scrub = ''
      const time = clamp01(progress / Math.max(.01, pinShare)) * total
      if (time === last) return
      last = time
      pieces.forEach((piece, index) => {
        const eased = easeOut(clamp01((time - index * stagger) / duration))
        piece.style.opacity = String(eased)
        piece.style.transform = eased >= 1 ? 'none' : `rotateX(${-92 * (1 - eased)}deg)`
        piece.style.setProperty('--fold-crease-now', String(crease * (1 - eased)))
      })
    })
  }, [pinDriven, pinShare, duration, stagger, creaseShading, text])

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
              <span className="fold-text__piece" data-char={char} style={{ '--i': index } as CSSProperties}>
                {char === ' ' ? ' ' : char}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
