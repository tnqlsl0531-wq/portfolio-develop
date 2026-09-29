import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import TearTicket from './TearTicket'
import wave from '../assets/ticket/wave.svg'
import barcode from '../assets/ticket/barcode.svg'
import tooltipArrow from '../assets/ticket/tooltipArrow.svg'
import './EntryTicket.css'

export const ENTRY_SESSION_KEY = 'portfolio:entry-ticket:v1'

export function hasEnteredPortfolio() {
  try { return sessionStorage.getItem(ENTRY_SESSION_KEY) === 'entered' }
  catch { return false }
}

export default function EntryTicket({ onEnter }: { onEnter: () => void }) {
  const tooltip = useRef<HTMLDivElement>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [leaving, setLeaving] = useState(false)
  const entered = useRef(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (timeout.current !== null) clearTimeout(timeout.current)
    }
  }, [])

  function hideTooltip() {
    if (tooltip.current) tooltip.current.style.visibility = 'hidden'
  }

  function moveTooltip(event: PointerEvent<HTMLDivElement>) {
    const element = tooltip.current
    if (!element || event.pointerType === 'touch' || entered.current) return
    const x = Math.max(12, Math.min(event.clientX + 20, window.innerWidth - element.offsetWidth - 12))
    const y = Math.max(12, Math.min(event.clientY + 24, window.innerHeight - element.offsetHeight - 12))
    element.style.transform = `translate3d(${x}px, ${y}px, 0)`
    element.style.visibility = 'visible'
  }

  function enter() {
    if (entered.current) return
    entered.current = true
    hideTooltip()
    setLeaving(true)
    // Remember admission only after the complete tear/drop animation.
    try { sessionStorage.setItem(ENTRY_SESSION_KEY, 'entered') } catch { /* Storage can be disabled. */ }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timeout.current = setTimeout(onEnter, reducedMotion ? 0 : 240)
  }

  return (
    <main className={`entry-ticket${leaving ? ' entry-ticket--leaving' : ''}`} aria-label="최수빈 포트폴리오 입장">
      <h1 className="sr-only">Grand Exhibition — 최수빈 디자인 포트폴리오</h1>
      <p className="sr-only" id="ticket-instructions">오른쪽 입장권을 잡아 당겨주세요. 키보드에서는 Tab 키로 입장권을 선택한 뒤 Enter 또는 Space 키를 누르면 입장합니다.</p>
      <div className="entry-ticket__wrap" onPointerMove={moveTooltip} onPointerLeave={hideTooltip} onPointerCancel={hideTooltip} aria-describedby="ticket-instructions">
        <TearTicket
          width={725} height={267} stubSize={194} radius={8}
          holes={20} notch={10} parallax={0} perspective={1800} tiltMax={10}
          borderWidth={0.5} border={false} recenter={false}
          background="#262626" stubBackground="#ffc7c3" color="#262626"
          ariaLabel="티켓을 당겨서 입장하기. Enter 또는 Space 키로도 입장할 수 있어요."
          onTear={enter}
          stub={<>
            <span className="entry-ticket__pass">ENTRY PASS</span>
            <span className="entry-ticket__admit">ADMIT<br />ONE</span>
            <img className="entry-ticket__barcode" src={barcode} alt="" draggable={false} />
            <span className="entry-ticket__serial">NO. 2026—001</span>
            <span className="entry-ticket__signature">CHOI - SUBIN</span>
          </>}
        >
          <img className="entry-ticket__wave" src={wave} alt="" draggable={false} />
          <div className="entry-ticket__heading" aria-hidden="true">
            <span className="entry-ticket__grand">GRAND</span>
            <span className="entry-ticket__exhibition">EXHIBITION</span>
          </div>
          <span className="entry-ticket__presenter">CHOI - SUBIN PRESENTS</span>
          <div className="entry-ticket__footer"><span>Design Portfolio</span><span>2026</span></div>
        </TearTicket>
      </div>
      <div className="entry-ticket__tooltip" ref={tooltip} aria-hidden="true">
        <span>티켓을 당겨서 입장하기</span><img src={tooltipArrow} alt="" />
      </div>
    </main>
  )
}
