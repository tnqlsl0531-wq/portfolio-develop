// 사진과 소개 내용이 준비되면 이 파일의 값만 바꾸면 됩니다.
// 사진은 src/assets/photos 폴더에 넣고 import해서 연결할 수 있습니다.
export type PhotoPosition = 'main' | 'upper' | 'right'
export const heroPhotos: Partial<Record<PhotoPosition, string>> = {}

export const profile = {
  name: '최수빈',
  englishName: 'Choi-Subin',
  role: 'UX/UI Designer',
  email: 'soobin0531@naver.com',
  portrait: '',
  instagramLabel: '@비즈니스 계정 생성 예정',
  // 피그마에 들어 있던 임시 이력입니다. 실제 이력으로 교체해주세요.
  history: [
    { label: '경력', value: '20XX – 20XX   Lorem ipsum dolor sit amet' },
    { label: '학력', value: '20XX – 20XX   Lorem ipsum dolor sit amet' },
    { label: '교육 이력', value: '20XX – 20XX   Lorem ipsum dolor sit amet' },
    { label: '수상', value: '20XX – 20XX   Lorem ipsum dolor sit amet' },
  ],
  paragraphs: [
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, nec gravida felis facilisis at. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
    'Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. Nam nulla quam, gravida non, commodo a, sodales sit amet, nisi. Pellentesque fermentum dolor aliquam quam.',
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, nec gravida felis facilisis at. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
  ],
}

export interface Project {
  id: 'kooksoondang' | 'jadu'
  title: string
  organization: string
  team: 'Team' | 'Personal'
  platform: 'Web' | 'App'
  period: string
  // 실제 프로젝트 주소가 생기면 여기에 넣어주세요.
  url?: string
}

export const projects: Project[] = [
  {
    id: 'kooksoondang',
    title: 'K-브랜드 리디자인 프로젝트',
    organization: '이젠아카데미DX교육센터',
    team: 'Team',
    platform: 'Web',
    period: '2026.05 ~ 2026.08',
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
