import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

// 3D 커튼(three.js)은 용량이 커서, 마지막 사진 가까이 스크롤했을 때만 불러옵니다.
const Curtain3D = lazy(() => import('./Curtain3D'))

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/* 마지막 단체 사진을 덮고 있는 무대 커튼(늘 닫혀 있음)
   - data-reveal: 커서 주변 원 안에서만 커튼이 투명해져 뒤의 사진이 보입니다(useColorReveal + Backstage.css).
   - 커튼은 3D 커튼(Curtain3D) 하나만 씁니다(10/1: 먼저 뜨던 CSS 커튼은 지움 — 커튼이 두 번 뜨던 문제).
     WebGL이 안 되는 기기나 '동작 줄이기' 설정에서는 커튼 없이 단체 사진이 그대로 보입니다(data-fallback, Backstage.css).
   - hover가 true면 커튼이 아주 살짝 찰랑거립니다. */
export default function StageCurtain({ hover, scroller }: { hover: boolean; scroller: RefObject<HTMLElement | null> }) {
  const layer = useRef<HTMLDivElement>(null)
  const [use3D] = useState(() => supportsWebGL() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const element = layer.current
    if (!element || !use3D) return
    const root = scroller.current
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true) }, { root, rootMargin: '1200px 0px' })
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root })
    nearObserver.observe(element)
    visibleObserver.observe(element)
    return () => {
      nearObserver.disconnect()
      visibleObserver.disconnect()
    }
  }, [scroller, use3D])

  return (
    <div ref={layer} className="backstage__curtain" data-hover={hover} data-ready={ready} data-fallback={!use3D || undefined}
      data-reveal="" aria-hidden="true">
      {use3D && near && (
        <Suspense fallback={null}>
          <Curtain3D hover={hover} active={visible} onReady={() => setReady(true)} />
        </Suspense>
      )}
    </div>
  )
}
