/*
 * 섹션 화면 고정(핀) — 섹션이 화면을 꽉 채우면 그 자리에 잠깐 멈춰 서 있다가(스크롤은 계속 되지만 화면은 그대로),
 * 정해진 거리(App.css의 --pin-hold)만큼 더 내리면 다시 흘러갑니다. 그동안 제목 애니메이션 등을 볼 수 있습니다.
 * - 화면보다 짧거나 같은 섹션: 섹션 맨 위가 화면 맨 위에 닿으면 멈춤.
 * - 화면보다 긴 섹션: 섹션 맨 아래가 화면 맨 아래에 닿으면(끝까지 다 본 뒤) 멈춤.
 * - CSS sticky로 만들어서 휠·키보드·스크롤 막대 어떤 방법으로 스크롤해도 똑같이 걸립니다.
 * - 폰·태블릿(700px 이하)과 동작 줄이기 설정에서는 걸지 않습니다(App.css).
 */
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export default function Pin({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pin = ref.current
    const content = body.current
    if (!pin || !content) return
    const measure = () => {
      // 긴 섹션은 아래 끝이 화면 아래 끝에 닿을 때 멈추도록, 멈추는 높이(top)를 음수로 둡니다.
      const top = Math.min(0, window.innerHeight - content.offsetHeight)
      pin.style.setProperty('--pin-top', `${top}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div ref={ref} className="pin">
      <div ref={body} className="pin__body">{children}</div>
    </div>
  )
}
