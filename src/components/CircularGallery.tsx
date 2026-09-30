/*
 * 사진 줄이 물결치듯 일렁이며 흐르는 효과 (React Bits Circular Gallery)
 * 원본: https://reactbits.dev/components/circular-gallery
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/CircularGallery
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 사용자가 고른 React Bits 설정 그대로
 *   bend 0(줄이 휘지 않고 곧게) · borderRadius 0.06 · 사진 아래 글씨 없음
 *   (부드럽게 따라오는 정도 scrollEase 0.04와 저절로 흐르는 움직임은 GalleryArchive.tsx에 있습니다.)
 *
 * 원본에서 바꾼 점
 * - ogl 패키지 없이 브라우저 WebGL만 씁니다(새로 설치할 패키지가 늘지 않도록).
 * - 가만히 있을 때의 물결이 원본은 너무 심해서(WOBBLE.idle 0.1 · 시간 0.04) 많이 줄였습니다.
 *   아래 WOBBLE 값으로 조절하며, 끌거나 굴리는 동안에는 원본처럼 물결이 더 커집니다.
 * - 원본은 사진을 전부 같은 크기 세로 타일로 잘라 넣지만, 여기서는 피그마(334-2) 사진 크기를 그대로 씁니다.
 *   그래서 판마다 크기가 달라, 둥근 모서리를 판 크기에 맞춰 진짜 원에 가깝게 깎습니다(원본은 판이 길쭉하면 모서리도 늘어남).
 * - 사진 채도(흑백 정도)를 아카이브가 쓰던 값 그대로 셰이더에서 처리합니다.
 * - 그림은 이 캔버스가 그리고, 누르기·키보드 이동은 위에 겹쳐 둔 원래 버튼이 그대로 맡습니다.
 *   그래서 사진을 눌러 원본을 크게 보는 기능과 화면 읽기 프로그램 지원이 그대로 남습니다.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import './CircularGallery.css'

/** 이번 프레임에 그릴 사진 한 장. x·y는 판 가운데, 단위는 모두 CSS 픽셀입니다. */
export type GalleryTile = {
  /** photos 배열에서 몇 번째 사진인지 */
  photo: number
  x: number
  y: number
  w: number
  h: number
  /** 1 = 원래 색, 0 = 흑백 */
  saturate: number
  /** 이번 프레임에 줄이 옆으로 움직인 거리(CSS 픽셀). 빠를수록 물결이 커집니다. */
  speed: number
  /** 물결의 시작점. 사진마다 다른 값을 줘야 다 같은 모양으로 일렁이지 않습니다(원본도 사진마다 다릅니다). */
  phase: number
}

export interface CircularGalleryHandle {
  /** advance를 false로 주면 물결이 흐르지 않고 멈춰 있습니다(동작 줄이기 설정). */
  draw(tiles: GalleryTile[], advance?: boolean): void
  ready(): boolean
}

/* 물결 크기: 사진이 제자리에서 최대 몇 %까지 부풀었다 줄었다 하는지입니다.
   idle = 가만히 있을 때, drag = 끌거나 굴릴 때 더해지는 정도, max = 아무리 빨리 끌어도 넘지 않는 한계,
   step = 물결이 흐르는 빠르기(원본 0.04).
   ※ max가 없으면 빠르게 끌 때 사진이 몇 배로 부풀어 모양이 무너지고, 그리는 면적이 폭증해 화면이 느려집니다.
   더 잔잔하게 하려면 idle을, 더 느리게 하려면 step을 줄이세요. */
const WOBBLE = { idle: .012, step: .018, drag: .35, max: .045 }
// 판을 잘게 나눈 격자(이 칸들이 물결칩니다). 원본은 100 × 50이지만, 사진이 작고 물결이 완만해 이 정도면 충분합니다.
const GRID = { x: 16, y: 12 }
// 원본 카메라(fov 45°, 거리 20)에서 세로로 보이는 범위 — 움직인 거리를 원본과 같은 단위로 바꿀 때 씁니다.
const VIEW_HEIGHT = 2 * Math.tan(45 * Math.PI / 360) * 20

const VERTEX = `attribute vec2 aGrid;
uniform vec2 uCanvas;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uTime;
uniform float uSpeed;
uniform float uIdle;
uniform float uDrag;
uniform float uMax;
varying vec2 vUv;
void main() {
  vUv = aGrid + 0.5;
  // 원본과 같은 물결식(판 안의 자리 -0.5~0.5로 sin·cos을 겹칩니다). 나누기 3은 값을 -1~1로 맞추려는 것입니다.
  // uTime에 사진마다 다른 시작점이 들어 있어, 옆 사진과 같은 모양으로 움직이지 않습니다.
  float wave = (sin(aGrid.x * 4.0 + uTime) * 1.5 + cos(aGrid.y * 2.0 + uTime) * 1.5) / 3.0;
  // 원본은 화면 한가운데를 기준으로 원근을 주기 때문에, 가장자리 사진일수록 크게 기울어집니다.
  // 여기서는 두 줄이 화면을 가로지르므로 사진마다 제 가운데를 기준으로 부풀렸다 줄여 고르게 일렁이게 합니다.
  // 빠르게 끌어도 uMax를 넘지 않게 막습니다(넘으면 사진 모양이 무너지고 화면이 느려집니다).
  float bulge = wave * min(uIdle + abs(uSpeed) * uDrag, uMax);
  vec2 screen = uCenter + aGrid * uSize * (1.0 + bulge);
  gl_Position = vec4(screen.x / uCanvas.x * 2.0 - 1.0, 1.0 - screen.y / uCanvas.y * 2.0, 0.0, 1.0);
}`

const FRAGMENT = `precision mediump float;
uniform sampler2D uTexture;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform float uRadius;
uniform float uSaturate;
varying vec2 vUv;

float roundedBoxSDF(vec2 point, vec2 halfSize, float radius) {
  vec2 d = abs(point) - halfSize;
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - radius;
}

void main() {
  // 판을 꽉 채우도록 그림을 잘라 넣습니다(원본과 같은 방식).
  vec2 ratio = vec2(
    min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
    min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
  );
  vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);
  vec4 color = texture2D(uTexture, uv);

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, uSaturate);

  // 둥근 모서리: 판의 짧은 변을 기준으로 깎아서 판이 길쭉해도 모서리가 늘어나지 않습니다.
  float radius = uRadius * min(uPlaneSize.x, uPlaneSize.y);
  vec2 point = (vUv - 0.5) * uPlaneSize;
  float d = roundedBoxSDF(point, uPlaneSize * 0.5 - radius, radius);
  float alpha = 1.0 - smoothstep(-1.0, 1.0, d);

  gl_FragColor = vec4(color.rgb, alpha);
}`

function buildGrid() {
  const positions: number[] = []
  for (let y = 0; y <= GRID.y; y++) {
    for (let x = 0; x <= GRID.x; x++) positions.push(x / GRID.x - .5, y / GRID.y - .5)
  }
  const indices: number[] = []
  const stride = GRID.x + 1
  for (let y = 0; y < GRID.y; y++) {
    for (let x = 0; x < GRID.x; x++) {
      const a = y * stride + x
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride)
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) }
}

function compile(gl: WebGLRenderingContext) {
  const program = gl.createProgram()
  if (!program) return null
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('CircularGallery 셰이더 오류:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      gl.deleteProgram(program)
      return null
    }
    gl.attachShader(program, shader)
    gl.deleteShader(shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('CircularGallery 연결 오류:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

const CircularGallery = forwardRef<CircularGalleryHandle, {
  /** 그릴 사진 목록(GalleryTile.photo가 가리키는 순서) */
  photos: { src: string; width: number; height: number }[]
  /** 모서리를 깎는 정도(판의 짧은 변 대비). 원본 기본값과 사용자가 고른 값 모두 0.06입니다. */
  borderRadius?: number
  className?: string
}>(function CircularGallery({ photos, borderRadius = .06, className = '' }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const scene = useRef<{
    canvas: HTMLCanvasElement
    gl: WebGLRenderingContext
    program: WebGLProgram
    at: Record<string, WebGLUniformLocation | null>
    textures: (WebGLTexture | null)[]
    sizes: [number, number][]
    indexCount: number
    time: number
  } | null>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return
    // 캔버스는 여기서 새로 만듭니다. 한 번 정리한 WebGL은 같은 캔버스에서 되살아나지 않기 때문입니다.
    const canvas = document.createElement('canvas')
    // WebGL2가 있으면 씁니다(그림 크기가 2의 제곱이 아니어도 밉맵을 만들 수 있어 축소했을 때 깔끔합니다).
    const gl = (canvas.getContext('webgl2', { alpha: true, antialias: true, depth: false })
      ?? canvas.getContext('webgl', { alpha: true, antialias: true, depth: false })) as WebGLRenderingContext | null
    if (!gl) return
    const program = compile(gl)
    if (!program) return
    element.appendChild(canvas)
    gl.useProgram(program)

    const { positions, indices } = buildGrid()
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    const aGrid = gl.getAttribLocation(program, 'aGrid')
    gl.enableVertexAttribArray(aGrid)
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0)
    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    const at = Object.fromEntries(
      ['uCanvas', 'uCenter', 'uSize', 'uTime', 'uSpeed', 'uIdle', 'uDrag', 'uMax',
        'uTexture', 'uImageSize', 'uPlaneSize', 'uRadius', 'uSaturate']
        .map(name => [name, gl.getUniformLocation(program, name)]),
    )

    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)

    // 사진이 불러와지기 전에는 아카이브의 빈 사진 색(#e5e5e5)으로 채워 둡니다.
    const placeholder = new Uint8Array([229, 229, 229, 255])
    const textures: (WebGLTexture | null)[] = []
    const sizes: [number, number][] = []
    const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    photos.forEach((photo, index) => {
      const texture = gl.createTexture()
      textures[index] = texture
      sizes[index] = [photo.width, photo.height]
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      const image = new Image()
      image.decoding = 'async'
      image.src = photo.src
      image.onload = () => {
        if (!scene.current) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        sizes[index] = [image.naturalWidth, image.naturalHeight]
        if (webgl2) {
          gl.generateMipmap(gl.TEXTURE_2D)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        }
      }
    })

    scene.current = { canvas, gl, program, at, textures, sizes, indexCount: indices.length, time: 100 * Math.random() }

    return () => {
      scene.current = null
      textures.forEach(texture => gl.deleteTexture(texture))
      gl.deleteBuffer(vertexBuffer)
      gl.deleteBuffer(indexBuffer)
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [photos])

  useImperativeHandle(ref, () => ({
    ready: () => scene.current !== null,
    draw(tiles, advance = true) {
      const box = container.current
      const current = scene.current
      if (!box || !current) return
      const { canvas, gl, at, textures, sizes } = current

      // 화면 배율이 높아도 1.25배까지만 그립니다(2배로 그리면 픽셀 수가 2.5배로 늘어 느려집니다).
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const width = Math.max(1, Math.round(box.clientWidth * dpr))
      const height = Math.max(1, Math.round(box.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      gl.clear(gl.COLOR_BUFFER_BIT)

      if (advance) current.time += WOBBLE.step
      gl.uniform2f(at.uCanvas, width, height)
      gl.uniform1f(at.uIdle, WOBBLE.idle)
      gl.uniform1f(at.uDrag, WOBBLE.drag)
      gl.uniform1f(at.uMax, WOBBLE.max)
      gl.uniform1f(at.uRadius, borderRadius)
      gl.uniform1i(at.uTexture, 0)
      gl.activeTexture(gl.TEXTURE0)
      // 움직인 거리를 원본 카메라의 단위로 바꿔야 물결이 커지는 정도가 원본과 같아집니다.
      const speedScale = dpr * VIEW_HEIGHT / height

      for (const tile of tiles) {
        const texture = textures[tile.photo]
        if (!texture) continue
        const size = sizes[tile.photo]
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform2f(at.uCenter, tile.x * dpr, tile.y * dpr)
        gl.uniform2f(at.uSize, tile.w * dpr, tile.h * dpr)
        gl.uniform2f(at.uPlaneSize, tile.w * dpr, tile.h * dpr)
        gl.uniform2f(at.uImageSize, size[0], size[1])
        gl.uniform1f(at.uSaturate, tile.saturate)
        gl.uniform1f(at.uSpeed, tile.speed * speedScale)
        // 사진마다 물결 시작점을 달리해 옆 사진과 같은 모양으로 움직이지 않게 합니다.
        gl.uniform1f(at.uTime, current.time + tile.phase)
        gl.drawElements(gl.TRIANGLES, current.indexCount, gl.UNSIGNED_SHORT, 0)
      }
    },
  }), [borderRadius])

  return <div ref={container} className={`circular-gallery ${className}`.trim()} aria-hidden="true" />
})

export default CircularGallery
