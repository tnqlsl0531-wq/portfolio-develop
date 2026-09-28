import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './StrokePresenter.css'

// React Bits Stroke Text의 SVG 글자별 드로잉 방식을 이 포트폴리오에 맞게 적용했습니다.
// 원본/라이선스: ../licenses/React-Bits-LICENSE.md 및 SOURCES.txt
// GSAP 설치 없이 같은 sine.inOut 곡선을 requestAnimationFrame으로 계산합니다.
// 글꼴·두께·자간은 피그마(node 122-767) 값을 따릅니다: Regular(400), 외곽선 1px, 자간 0.
const settings = {
  text: 'CHOI-SUBIN PRESENTS',
  strokeColor: '#F8574F',
  strokeWidth: 1,
  drawDuration: 1.9,
  fillDelay: 0.5,
  fillMode: 'none',
  ease: 'sine.inOut',
  fontWeight: 400,
  letterSpacing: 0,
  trigger: 'once',
  stagger: 0.05,
  fontSize: 80,
} as const

const lines = ['CHOI-SUBIN', 'PRESENTS'] as const
const lineHeight = settings.fontSize * 1.2
const dash = Math.max(settings.fontSize * 7, 200)
const characterCount = settings.text.length
// fillMode='none'일 때는 원본처럼 fillDelay가 재생 시간에 영향을 주지 않습니다.
// 한 번만 재생: 마지막 글자까지 다 그려지면 그 상태로 멈춥니다.
const totalDuration = settings.drawDuration + (characterCount - 1) * settings.stagger

interface TextMetrics {
  width: number
  baseline: number
  rightBearings: number[]
}

export default function StrokePresenter() {
  const rootRef = useRef<HTMLParagraphElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [metrics, setMetrics] = useState<TextMetrics | null>(null)
  const [fontReady, setFontReady] = useState(false)

  useLayoutEffect(() => {
    let cancelled = false

    function measure() {
      if (cancelled || !svgRef.current) return
      const nodes = Array.from(svgRef.current.querySelectorAll<SVGTextElement>('text'))
      if (nodes.length !== lines.length) return
      const boxes = nodes.map(node => node.getBBox())
      const first = boxes[0]
      const relativeTop = first.y - nodes[0].y.baseVal[0].value
      const next = {
        width: Math.ceil(Math.max(...boxes.map(box => box.width)) + settings.strokeWidth * 2),
        baseline: (lineHeight - first.height) / 2 - relativeTop,
        rightBearings: boxes.map((box, index) => box.x + box.width - nodes[index].x.baseVal[0].value),
      }
      setMetrics(previous => previous &&
        Math.abs(previous.width - next.width) < 0.1 &&
        Math.abs(previous.baseline - next.baseline) < 0.1 &&
        previous.rightBearings.every((bearing, index) => Math.abs(bearing - next.rightBearings[index]) < 0.1)
        ? previous : next)
    }

    measure()
    // 글꼴을 읽은 다음 시작해서 첫 반복 중에 글자가 바뀌는 현상을 막습니다.
    document.fonts.load(`${settings.fontWeight} ${settings.fontSize}px "Special Gothic Expanded One"`, settings.text)
      .then(() => document.fonts.ready)
      .then(() => {
        if (cancelled) return
        measure()
        setFontReady(true)
      })
      .catch(() => {
        if (cancelled) return
        measure()
        setFontReady(true)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const svg = svgRef.current
    if (!root || !svg || !metrics || !fontReady) return

    const characters = Array.from(svg.querySelectorAll<SVGTSpanElement>('[data-stroke-char]'))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame: number | null = null
    let previousTime: number | null = null
    let elapsed = 0
    let inView = root.getBoundingClientRect().bottom > 0 && root.getBoundingClientRect().top < window.innerHeight

    function paint(seconds: number) {
      const time = Math.min(seconds, totalDuration)
      for (const character of characters) {
        const index = Number(character.dataset.strokeChar)
        const progress = Math.min(1, Math.max(0, (time - index * settings.stagger) / settings.drawDuration))
        const eased = (1 - Math.cos(Math.PI * progress)) / 2
        character.style.strokeDashoffset = String(dash * (1 - eased))
      }
    }

    function stop() {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      previousTime = null
    }

    function tick(now: number) {
      if (previousTime !== null) elapsed += (now - previousTime) / 1000
      previousTime = now
      paint(elapsed)
      if (elapsed >= totalDuration) {
        stop()
        return
      }
      frame = window.requestAnimationFrame(tick)
    }

    function syncPlayback() {
      stop()
      if (reducedMotion.matches) {
        for (const character of characters) character.style.strokeDashoffset = '0'
        return
      }
      paint(elapsed)
      if (elapsed >= totalDuration) return
      // 히어로 밖으로 스크롤하거나 다른 탭을 볼 때는 잠시 멈췄다가, 다시 보이면 이어서 그립니다.
      if (inView && !document.hidden) frame = window.requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      syncPlayback()
    })
    observer.observe(root)
    document.addEventListener('visibilitychange', syncPlayback)
    reducedMotion.addEventListener('change', syncPlayback)
    syncPlayback()

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncPlayback)
      reducedMotion.removeEventListener('change', syncPlayback)
    }
  }, [metrics, fontReady])

  const width = metrics?.width ?? settings.fontSize * 10
  const height = lineHeight * lines.length

  return (
    <p
      ref={rootRef}
      className="hero__presenter stroke-presenter"
      role="img"
      aria-label={settings.text}
      style={{ width: `${width / settings.fontSize}em`, height: `${height / settings.fontSize}em` }}
    >
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
        {lines.map((line, lineIndex) => (
          <text
            key={line}
            x={width - settings.strokeWidth - (metrics?.rightBearings[lineIndex] ?? 0)}
            y={(metrics?.baseline ?? settings.fontSize) + lineIndex * lineHeight}
            textAnchor="end"
            fill="none"
            stroke={settings.strokeColor}
            strokeWidth={settings.strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="miter"
            style={{ fontSize: settings.fontSize, fontWeight: settings.fontWeight, letterSpacing: settings.letterSpacing }}
          >
            {Array.from(line).map((character, index) => (
              <tspan
                key={index}
                data-stroke-char={index + (lineIndex === 0 ? 0 : lines[0].length + 1)}
                strokeDasharray={dash}
                strokeDashoffset={dash}
              >{character}</tspan>
            ))}
          </text>
        ))}
      </svg>
    </p>
  )
}
