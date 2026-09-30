/*
 * 섹션 화면 고정(핀) — 섹션이 화면에 들어와 자리를 잡으면 그 자리에 잠깐 멈춰 서 있다가(스크롤은 계속 되지만 화면은 그대로),
 * 정해진 거리(App.css의 --pin-hold, 또는 hold)만큼 더 내리면 다시 흘러갑니다. 그동안 제목 애니메이션 등을 볼 수 있습니다.
 * - align: 화면보다 긴 섹션을 어디서 멈출지
 *     'end'    = 섹션 아래 끝이 화면 아래 끝에 닿을 때(끝까지 다 본 뒤) — 기본
 *     'center' = 섹션 가운데가 화면 가운데에 올 때(글자가 화면 가운데쯤에 보임)
 *     'start'  = 섹션 맨 위가 화면 맨 위에 닿을 때(제목이 보이기 시작할 때)
 *   화면보다 짧거나 같은 섹션은 어느 쪽이든 섹션 맨 위가 화면 맨 위에 닿으면 멈춥니다.
 * - hold: 이 섹션만 멈춰 있는 거리를 다르게 줄 때(예: '110vh').
 * - focus: [위, 아래] — 멈춰 있는 동안 꼭 화면에 다 보여야 하는 부분(섹션 높이 대비 0~1). 주면 align 대신 이걸로 멈추는 높이를 정합니다.
 *   그 부분이 화면에 다 들어가면 화면 세로 가운데에 오게, 안 들어가면 아래쪽(= 아래 끝)이 화면 아래 끝에 맞게 멈춥니다(10/1, Stage Works 무대가 잘려서).
 * - landAt: 목차(프로그램북)로 이 섹션에 올 때, 멈춰 있는 거리 중 어디(0~1)에 내려줄지. 예: 제목 애니메이션이 끝난 자리.
 * - stop: 휠을 세게 굴려 빠르게 지나가도 이 섹션(landAt 자리)에서 한 번은 꼭 멈춥니다(useSmoothScroll.ts). 한 번 더 굴리면 지나갑니다.
 * - CSS sticky로 만들어서 휠·키보드·스크롤 막대 어떤 방법으로 스크롤해도 똑같이 걸립니다.
 * - 폰·태블릿(700px 이하)과 동작 줄이기 설정에서는 걸지 않습니다(App.css).
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'

type Props = {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  focus?: [number, number]
  hold?: string
  landAt?: number
  stop?: boolean
}

export default function Pin({ children, align = 'end', focus, hold, landAt, stop }: Props) {
  const [focusTop, focusBottom] = focus ?? [NaN, NaN]
  const ref = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pin = ref.current
    const content = body.current
    if (!pin || !content) return
    const measure = () => {
      // 긴 섹션은 멈추는 높이(top)를 음수로 두어, 섹션의 원하는 부분이 화면에 오도록 합니다.
      const viewport = window.innerHeight
      const height = content.offsetHeight
      const extra = Math.min(0, viewport - height)
      let top = align === 'start' ? 0 : align === 'center' ? extra / 2 : extra
      if (!Number.isNaN(focusTop)) {
        // 꼭 보여야 하는 부분(focus)이 화면에 들어가면 가운데로, 안 들어가면 그 아래 끝을 화면 아래 끝에 맞춥니다.
        const span = (focusBottom - focusTop) * height
        const wanted = span <= viewport ? viewport / 2 - (focusTop + focusBottom) / 2 * height : viewport - focusBottom * height
        top = Math.min(0, Math.max(extra, wanted))
      }
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
  }, [align, focusTop, focusBottom])

  const style = hold ? ({ '--pin-hold': hold } as CSSProperties) : undefined
  return (
    <div ref={ref} className="pin" style={style} data-land={landAt} data-stop={stop || undefined}>
      <div ref={body} className="pin__body">{children}</div>
    </div>
  )
}

/**
 * element가 들어 있는 섹션이 화면에 멈춰 있는 동안 얼마나 스크롤했는지(0 = 막 멈춤, 1 = 멈춤이 풀리는 순간).
 * 화면 고정을 안 하는 경우(폰·태블릿·동작 줄이기, 또는 Pin 밖)에는 null을 돌려줍니다 → 쓰는 쪽은 원래 방식으로 움직이면 됩니다.
 */
export function pinProgress(element: Element): number | null {
  const travel = pinTravel(element)
  return travel && Math.min(1, Math.max(0, travel.scrolled / travel.hold))
}

/**
 * pinProgress의 px 버전: scrolled = 멈추기 시작한 뒤 스크롤한 거리(px, 멈추기 전이면 음수 = 멈출 때까지 남은 거리), hold = 멈춰 있는 거리.
 * 멈추기 조금 전부터 움직임을 시작하고 싶을 때 씁니다. 화면 고정을 안 하면 null.
 */
export function pinTravel(element: Element): { scrolled: number; hold: number } | null {
  const pin = element.closest<HTMLElement>('.pin')
  if (!pin) return null
  const hold = pinHold(pin)
  if (hold <= 0) return null
  // 멈추기 시작하는 순간 = 묶음 윗선이 --pin-top(가운데·끝 맞춤이면 음수)에 닿을 때
  return { scrolled: pinTop(pin) - pin.getBoundingClientRect().top, hold }
}

/** 멈춰 있는 거리(px). 화면 고정을 안 하면 0. */
export function pinHold(pin: HTMLElement) {
  return parseFloat(getComputedStyle(pin, '::after').height) || 0
}

/** 멈춰 있을 때 묶음 윗선의 화면 위치(px, Pin이 정한 --pin-top). */
export function pinTop(pin: HTMLElement) {
  return parseFloat(pin.style.getPropertyValue('--pin-top')) || 0
}

/**
 * 이 묶음에 '내려앉는' 스크롤 위치(문서 위에서부터 px): 화면에 멈추기 시작하는 자리 + 멈춰 있는 거리 × landAt.
 * 목차(프로그램북)로 이동할 때, 빠른 휠에서도 꼭 멈출 자리(stop)를 정할 때 씁니다.
 */
export function pinLandTop(pin: HTMLElement) {
  const hold = pinHold(pin)
  const land = pin.dataset.land && hold > 0 ? Number(pin.dataset.land) * hold : 0
  return pin.getBoundingClientRect().top + window.scrollY - pinTop(pin) + land
}

/**
 * 스크롤·창 크기·동작 줄이기 설정이 바뀔 때마다(한 프레임에 한 번) update를 불러 줍니다. 처음 한 번은 바로 부릅니다.
 * 돌려주는 함수를 부르면 멈춥니다(useEffect의 정리 함수로 쓰세요).
 * pinProgress와 함께 써서 '멈춰 있는 동안 스크롤한 만큼' 움직이는 효과를 만듭니다.
 */
export function onScrollFrame(update: () => void) {
  let frame = 0
  const run = () => { frame = 0; update() }
  const request = () => { if (!frame) frame = requestAnimationFrame(run) }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  update()
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request)
  reduced.addEventListener('change', request)
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', request)
    window.removeEventListener('resize', request)
    reduced.removeEventListener('change', request)
  }
}

/**
 * '일정 스크롤에 닿으면 애니메이션을 통째로 한 번 재생'하는 시점을 알려줍니다(9/30 밤 2).
 * - pinned: 이 섹션이 화면 고정(Pin)을 쓰는 중인지(폰·태블릿·동작 줄이기면 false)
 * - play  : 재생할 때가 됐는지
 *     고정을 쓰면 = 섹션이 멈추기 시작하는 순간(lead를 주면 멈추기 '화면 높이 × lead' 전부터)
 *     고정을 안 쓰면 = 섹션 윗선이 화면 높이의 VIEW_AT 지점까지 올라왔을 때
 *   섹션이 화면 아래로 완전히 내려가면(위로 되돌아가면) 다시 false가 돼서, 다음에 내려올 때 또 재생됩니다.
 */
const VIEW_AT = .6
export function usePinTrigger(ref: RefObject<Element | null>, lead = 0) {
  const [state, setState] = useState({ pinned: false, play: false })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    return onScrollFrame(() => {
      const viewport = window.innerHeight
      const top = element.getBoundingClientRect().top
      const travel = pinTravel(element)
      const pinned = travel !== null
      setState(previous => {
        let play = previous.play
        if (top > viewport) play = false
        else if (travel ? travel.scrolled >= -lead * viewport : top < viewport * VIEW_AT) play = true
        return previous.play === play && previous.pinned === pinned ? previous : { pinned, play }
      })
    })
  }, [ref, lead])
  return state
}
