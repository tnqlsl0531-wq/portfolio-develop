/*
 * 섹션 화면 고정(핀) — 섹션이 화면에 들어와 자리를 잡으면 그 자리에 잠깐 멈춰 서 있다가(스크롤은 계속 되지만 화면은 그대로),
 * 정해진 거리(App.css의 --pin-hold, 또는 hold)만큼 더 내리면 다시 흘러갑니다. 그동안 제목 애니메이션 등을 볼 수 있습니다.
 * - align: 화면보다 긴 섹션을 어디서 멈출지
 *     'end'    = 섹션 아래 끝이 화면 아래 끝에 닿을 때(끝까지 다 본 뒤) — 기본
 *     'center' = 섹션 가운데가 화면 가운데에 올 때(글자가 화면 가운데쯤에 보임)
 *     'start'  = 섹션 맨 위가 화면 맨 위에 닿을 때(제목이 보이기 시작할 때)
 *   화면보다 짧거나 같은 섹션은 어느 쪽이든 섹션 맨 위가 화면 맨 위에 닿으면 멈춥니다.
 * - hold: 이 섹션만 멈춰 있는 거리를 다르게 줄 때(예: '110vh').
 * - landAt: 목차(프로그램북)로 이 섹션에 올 때, 멈춰 있는 거리 중 어디(0~1)에 내려줄지. 예: 제목 애니메이션이 끝난 자리.
 * - CSS sticky로 만들어서 휠·키보드·스크롤 막대 어떤 방법으로 스크롤해도 똑같이 걸립니다.
 * - 폰·태블릿(700px 이하)과 동작 줄이기 설정에서는 걸지 않습니다(App.css).
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  hold?: string
  landAt?: number
}

export default function Pin({ children, align = 'end', hold, landAt }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pin = ref.current
    const content = body.current
    if (!pin || !content) return
    const measure = () => {
      // 긴 섹션은 멈추는 높이(top)를 음수로 두어, 섹션의 원하는 부분이 화면에 오도록 합니다.
      const extra = Math.min(0, window.innerHeight - content.offsetHeight)
      const top = align === 'start' ? 0 : align === 'center' ? extra / 2 : extra
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
  }, [align])

  const style = hold ? ({ '--pin-hold': hold } as CSSProperties) : undefined
  return (
    <div ref={ref} className="pin" style={style} data-land={landAt}>
      <div ref={body} className="pin__body">{children}</div>
    </div>
  )
}
