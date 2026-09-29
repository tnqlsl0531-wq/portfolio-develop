/* 메인 화면 Artist Gallery 섹션의 사진 (피그마 122-625 · Diagonal marquee · 4 tracks)
   - 4줄(1·3줄은 위로, 2·4줄은 아래로 흐름), 사진 폭은 모두 192, 높이는 원본 비율(아래 숫자, 1920 화면 기준).
   - 그림은 src/assets/gallery/track1-01.webp 등: 피그마와 같은 자르기, 표시 크기의 2배. 원본 파일 이름은 SOURCES.txt에 있습니다.
   - 메인에서는 채도를 아주 낮게(App.css의 --gallery-saturate) 깔아 둡니다. */
const images = import.meta.glob<string>('./assets/gallery/*.webp', { eager: true, import: 'default' })

export interface GalleryPhoto {
  src: string
  height: number // 1920 화면 기준 높이(폭은 192)
  alt: string
}

// 줄마다 사진 높이(피그마 순서 그대로)
const HEIGHTS: number[][] = [
  [128, 345, 288, 128, 341, 288, 128, 288, 338],
  [286, 288, 287, 240, 287, 341, 268],
  [287, 288, 341, 108, 238, 288, 241],
  [287, 341, 287, 288, 341],
]

let count = 0
export const galleryTracks: GalleryPhoto[][] = HEIGHTS.map((heights, track) =>
  heights.map((height, index) => {
    count += 1
    return {
      src: images[`./assets/gallery/track${track + 1}-${String(index + 1).padStart(2, '0')}.webp`],
      height,
      alt: `아티스트 갤러리 사진 ${count}`,
    }
  }),
)
