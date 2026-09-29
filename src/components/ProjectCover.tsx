import kooksoondangLogo from '../assets/design/kooksoondang-logo.svg'
import kooksoondangDot from '../assets/design/kooksoondang-dot.svg'
import jaduLogo from '../assets/design/jadu-logo.svg'
import type { Project } from '../portfolio'
import './ProjectCover.css'

/* 작품 대표 그림 카드 (16:9 흰 카드 + 로고)
   - 작품 선택 화면(피그마 186-201)의 600×337.5 카드와 BACKSTAGE 페이지(피그마 96-516) 맨 위 622×350 카드에 같이 씁니다.
   - 카드 폭에 맞춰 테두리·모서리·로고가 함께 커지고 작아집니다(부모 폭 기준 cqw 단위). */
export default function ProjectCover({ project, className = '' }: { project: Project; className?: string }) {
  return (
    <div className={`project-cover-frame ${className}`}>
      <div className={`project-cover project-cover--${project.id}`}>
        {project.id === 'kooksoondang' ? (
          <>
            <div className="project-cover__kooksoondang"><img src={kooksoondangLogo} alt="국순당" /></div>
            <img className="project-cover__dot" src={kooksoondangDot} alt="" />
          </>
        ) : <img className="project-cover__jadu" src={jaduLogo} alt="자두야" />}
      </div>
    </div>
  )
}
