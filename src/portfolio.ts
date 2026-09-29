// 사진과 소개 내용이 준비되면 이 파일의 값만 바꾸면 됩니다.
// 사진은 src/assets/photos 폴더에 넣고 import해서 연결할 수 있습니다.
import directorPortrait from './assets/photos/director-portrait.webp'
import heroMain from './assets/photos/hero-main.webp'
import heroUpper from './assets/photos/hero-upper.webp'
import heroRight from './assets/photos/hero-right.webp'

export type PhotoPosition = 'main' | 'upper' | 'right'
// 피그마 히어로(node 122-582) 사진 3장입니다. 피그마의 색 보정을 그대로 담고, 배경은 투명하게 두었습니다(표시 크기의 2배).
// main: 한복(가운데), upper: 고글 모자(위 오른쪽), right: 빨간 연미복(아래 오른쪽, 좌우 반전 포함)
export const heroPhotos: Partial<Record<PhotoPosition, string>> = {
  main: heroMain,
  upper: heroUpper,
  right: heroRight,
}

export const profile = {
  name: '최수빈',
  englishName: 'Choi-Subin',
  role: 'UX/UI Designer',
  email: 'soobin0531@naver.com',
  // 피그마 Director’s Note 사진(원본 1509×2367)을 표시 크기 404×634의 2배로 줄인 파일
  portrait: directorPortrait,
  instagramLabel: '@비즈니스 계정 생성 예정',
  // 피그마 Director’s Note(node 207-362) 내용입니다. detail은 값 아래에 작은 회색 글씨로 붙습니다.
  history: [
    { label: '학력', value: '백석예술대학교 공연예술학과 뮤지컬전공' },
    { label: '교육 이력', value: '이젠아카데미 / UXUI디자인&웹기획 프론트엔드', detail: '2026.04.15 - 2026.10.02' },
    { label: '사용 도구', value: 'Figma, Photoshop, Illustrator' },
    { label: '수상', value: '2026 · 디자인 부문 최우수상 · 국순당 팀 프로젝트' },
  ] as { label: string; value: string; detail?: string }[],
  // 피그마에서 직접 줄을 나눈 그대로입니다(한 줄 = 배열 한 칸). 폰·태블릿처럼 좁은 화면에서는 자연스럽게 이어 붙여 보여줍니다.
  paragraphs: [
    [
      '어릴 때부터 사진을 보정하고, 무언가를 꾸미며 원하는 모습을 만들어가는',
      '일을 좋아했습니다. 직접 손을 대어 결과물이 달라지는 과정을 즐겼고,',
      '언젠가는 디자인을 제 일로 삼고 싶다는 마음이 있었습니다.',
      '새로운 진로를 고민하던 시기에, 오래 마음에 두었던 이 분야에 도전하기로',
      '했습니다. 잘해낼 수 있다는 자신감은 익숙한 무대에서 새로운 분야로',
      '나아가는 힘이 되었습니다. 지금은 그 관심과 열정을 바탕으로, 사용자의',
      '시선에서 화면을 구성하고 경험을 설계하는 법을 배워가고 있습니다.',
    ],
    [
      '공연을 하며 늘 고민한 것은 ‘관객이 어떻게 느낄까’였습니다.',
      '무대 위의 표현과 이야기가 사람들에게 어떤 감정으로 남을지 생각했고,',
      '누군가 제 공연을 통해 좋은 에너지를 얻을 때 가장 큰 보람을 느꼈습니다.',
      '제가 하는 일이 타인에게 긍정적인 영향을 줄 수 있다는 것이,',
      '계속 표현하고 도전하게 만드는 이유였습니다.',
      '디자인을 대하는 마음도 같습니다. 사용자가 어떤 느낌으로 화면을',
      '마주하고 무엇을 이해하게 될지 고민하며, 흥미롭게 다가가면서도',
      '전하려는 내용이 명확하게 전달되는 디자인을 만들고 싶습니다.',
    ],
    [
      '보여주고 싶은 것이 많을수록, 가장 중요한 것을 고르는 연습이 필요하다고',
      '느낍니다. 공연에서 메시지와 감정을 전달하던 경험을 바탕으로,',
      '디자인에서도 핵심을 분명하게 보여주는 힘을 키워가고 있습니다.',
      '깊이 몰입하는 열정과 끝까지 시도하는 끈기로 낯선 과제에 도전하며,',
      '목표를 조금씩 넓혀갑니다. 다양한 표현을 탐색하고 익숙한 작업 방식에도',
      '변화를 주면서, 스스로 정해둔 틀을 계속 깨고 싶습니다.',
      '좋은 첫인상이 ‘이 사람의 다른 작업도 보고 싶다’는 기대로 이어지는,',
      '다채로운 디자이너가 되고자 합니다.',
    ],
  ],
}

export interface Project {
  id: 'kooksoondang' | 'jadu'
  title: string
  organization: string
  team: 'Team' | 'Personal'
  platform: 'Web' | 'App'
  period: string
  // 실제 프로젝트 주소가 생기면 여기에 넣어주세요. (작품 선택 화면 ON STAGE, BACKSTAGE 페이지 GO ONSTAGE)
  url?: string
  // 기획서 주소(PDF·노션·피그마 등)가 생기면 여기에 넣어주세요. (BACKSTAGE 페이지 '기획서 보러가기')
  planUrl?: string
}

export const projects: Project[] = [
  {
    id: 'kooksoondang',
    title: 'K-브랜드 리디자인 프로젝트',
    organization: '이젠아카데미DX교육센터',
    team: 'Team',
    platform: 'Web',
    period: '2026.05 ~ 2026.08',
    url: 'https://jin0484.github.io/kooksoondang/',
  },
  {
    id: 'jadu',
    title: 'AI 챗봇 커뮤니티 웹앱 프로젝트',
    organization: '이젠아카데미DX교육센터',
    team: 'Team',
    platform: 'App',
    period: '2026.08 ~ 2026.09',
  },
]

// 피그마의 1 / 3 구성을 유지합니다. 아직 없는 프로젝트는 COMING SOON입니다.
export const plannedProjectPages = 3

export interface GalleryPhoto {
  src: string
  alt: string
}

// 피그마의 4개 트랙 × 10개 사진 자리. 원본이 없어 현재는 비어 있습니다.
export const galleryPhotos: GalleryPhoto[] = Array.from({ length: 40 }, (_, index) => ({
  src: '',
  alt: `아티스트 갤러리 사진 ${index + 1}`,
}))
