/* Artist Gallery 아카이브 사진 (피그마 334-2 '06 · Artist gallery archive')
   - 윗줄(왼쪽으로 흐름) top-01~19, 아랫줄(오른쪽으로 흐름) bottom-01~19 — 피그마 순서 그대로입니다.
   - 줄에 보이는 그림(src/assets/archive/top-01.webp 등)은 피그마와 같은 자르기, 표시 크기의 2배입니다.
   - 누르면 크게 보이는 원본(top-01-full.webp 등)은 자르지 않은 전체 사진(긴 변 최대 1800px)입니다.
   - 원본 파일 이름은 SOURCES.txt에 적어 두었습니다. 사진을 바꾸려면 같은 이름으로 그림 두 장을 바꾸고 아래 크기를 맞추면 됩니다. */
const images = import.meta.glob<string>('./assets/archive/*.webp', { eager: true, import: 'default' })

export interface ArchivePhoto {
  src: string // 줄에 보이는 그림(피그마 자르기)
  full: string // 누르면 보이는 원본
  width: number // 줄에서의 크기(1920×1080 화면 기준)
  height: number
  fullWidth: number // 원본 그림 크기
  fullHeight: number
  alt: string
}

type Size = [width: number, height: number, fullWidth: number, fullHeight: number]

// [줄에서의 폭, 높이, 원본 폭, 원본 높이] — 피그마 사진 틀 크기(원본 비율)
const TOP: Size[] = [
  [169, 304, 828, 1800],
  [171, 256, 1201, 1800],
  [253, 169, 1080, 720],
  [207, 310, 1201, 1800],
  [170, 302, 1012, 1800],
  [157, 279, 1012, 1800],
  [169, 253, 828, 1792],
  [207, 310, 1200, 1800],
  [207, 310, 1200, 1800],
  [185, 277, 1201, 1800],
  [157, 279, 1013, 1800],
  [169, 253, 1200, 1800],
  [208, 310, 828, 1792],
  [185, 277, 1201, 1800],
  [187, 234, 1278, 1595],
  [276, 155, 1800, 1013],
  [176, 310, 828, 1792],
  [207, 310, 1200, 1800],
  [170, 302, 1013, 1800],
]
const BOTTOM: Size[] = [
  [176, 310, 828, 1800],
  [174, 310, 1012, 1800],
  [185, 277, 1201, 1800],
  [156, 275, 828, 1792],
  [181, 241, 1280, 1707],
  [207, 310, 1200, 1800],
  [169, 253, 1200, 1800],
  [177, 247, 828, 1792],
  [202, 254, 828, 1042],
  [207, 310, 1201, 1800],
  [175, 310, 1012, 1800],
  [185, 277, 1200, 1800],
  [155, 276, 828, 1792],
  [171, 256, 1201, 1800],
  [175, 310, 1012, 1800],
  [253, 169, 1800, 1201],
  [171, 256, 1201, 1800],
  [185, 278, 1199, 1800],
  [175, 310, 1012, 1800],
]

const build = (row: 'top' | 'bottom', sizes: Size[], start: number): ArchivePhoto[] =>
  sizes.map(([width, height, fullWidth, fullHeight], index) => {
    const name = `${row}-${String(index + 1).padStart(2, '0')}`
    return {
      src: images[`./assets/archive/${name}.webp`],
      full: images[`./assets/archive/${name}-full.webp`],
      width,
      height,
      fullWidth,
      fullHeight,
      alt: `아티스트 갤러리 사진 ${start + index}`,
    }
  })

export const archiveRows = {
  top: build('top', TOP, 1),
  bottom: build('bottom', BOTTOM, TOP.length + 1),
}
