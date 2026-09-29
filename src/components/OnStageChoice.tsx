import type { ReactNode } from 'react'
import grandma from '../assets/onstage/grandma.png'
import bottle from '../assets/onstage/bottle.png'
import cup from '../assets/onstage/cup.png'
import './OnStageChoice.css'

export default function OnStageChoice({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
  const content = <>
    <span className="onstage-choice__art" aria-hidden="true">
      <span className="onstage-choice__piece onstage-choice__grandma"><img src={grandma} width={264} height={324} alt="" draggable={false} /></span>
      <span className="onstage-choice__piece onstage-choice__bottle"><img src={bottle} width={206} height={248} alt="" draggable={false} /></span>
      <span className="onstage-choice__piece onstage-choice__cup"><img src={cup} width={132} height={131} alt="" draggable={false} /></span>
    </span>
    {children}
  </>

  return href
    ? <a className="stage-choice stage-choice--on" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <button className="stage-choice stage-choice--on" type="button" onClick={onClick}>{content}</button>
}
