/*
 * 위에서 쏟아지는 조명 빛줄기 (React Bits Light Rays)
 * 원본: https://reactbits.dev/backgrounds/light-rays
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Backgrounds/LightRays
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 사용자가 준 React Bits 설정 그대로
 *   raysSpeed 0.1 · lightSpread 0.1 · rayLength 0.5 · saturation 0.8 · mouseInfluence 0.2
 *   (실제로 쓰는 값은 StageWorks.tsx에 적어 두었습니다.)
 *
 * 원본에서 바꾼 점
 * - ogl 패키지 없이 브라우저 WebGL만 씁니다(새로 설치할 패키지가 늘지 않도록). 빛을 그리는 셰이더 계산은 원본과 같습니다.
 * - 쓰지 않는 기능(pulsating, noiseAmount, distortion, lightMode)은 덜어 냈고, fadeDistance는 원본 기본값 1.0으로 고정했습니다.
 * - 색 입히는 방법을 바꿨습니다. 원본은 어두운 배경에 흰 빛을 얹는 방식이라, 밝은 무대 배경(#fafafa) 위에서는
 *   빛이 배경에 묻혀 보이지 않습니다. 그래서 빛줄기 모양·움직임 계산(rayStrength)은 원본 그대로 두고,
 *   그 세기를 조명 색의 진하기로 씁니다. 배경보다 따뜻한 색이 옅게 깔려서 실제 무대 조명처럼 보입니다.
 * - intensity를 더했습니다. 원본 계산이 내는 진하기는 최대 0.15 정도라 밝은 배경에서는 눈에 띄지 않아,
 *   이 값으로 끌어올립니다(작게 하면 옅어지고 크게 하면 진해집니다).
 * - 동작 줄이기 설정에서는 빛줄기를 그리지 않습니다(원본은 그립니다).
 * - 화면에 보일 때만 그립니다. 단 WebGL 준비는 처음 보일 때 한 번만 하고, 화면을 오르내려도 그리기만 멈췄다 이어 갑니다
 *   (매번 새로 만들면 브라우저가 WebGL을 더 안 만들어 주는 경우가 있습니다).
 * - 사라질 때 이벤트·애니메이션·WebGL을 정리합니다.
 */
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import './LightRays.css'

export type RaysOrigin = 'top-center' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-center' | 'bottom-left' | 'bottom-right'

const VERTEX = `attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

const FRAGMENT = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float saturation;
uniform float intensity;
uniform vec2  mousePos;
uniform float mouseInfluence;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float spreadFactor = pow(max(cosAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float rayDistance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - rayDistance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x - rayDistance) / iResolution.x, 0.5, 1.0);

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  float rays1 = rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  float rays2 = rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  float strength = clamp(rays1 * 0.5 + rays2 * 0.4, 0.0, 1.0);

  // 빛이 아래로 내려갈수록 옅어집니다(원본의 세로 감쇠 값을 그대로 씁니다).
  float brightness = 1.0 - (coord.y / iResolution.y);
  strength *= 0.3 + brightness * 0.6;
  // 밝은 배경에서는 셰이더가 내는 진하기(최대 0.15쯤)로는 배경을 이기지 못해 빛이 보이지 않습니다.
  // intensity로 끌어올린 뒤 1을 넘지 않게 자릅니다.
  strength = clamp(strength * intensity, 0.0, 1.0);

  vec3 tint = raysColor;
  if (saturation != 1.0) {
    float gray = dot(tint, vec3(0.299, 0.587, 0.114));
    tint = mix(vec3(gray), tint, saturation);
  }

  gl_FragColor = vec4(tint, strength);
}`

function hexToRgb(hex: string): [number, number, number] {
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!parsed) return [1, 1, 1]
  return [parseInt(parsed[1], 16) / 255, parseInt(parsed[2], 16) / 255, parseInt(parsed[3], 16) / 255]
}

// 빛이 시작하는 자리(anchor)와 나아가는 방향(dir).
// originPoint를 주면 그 자리(가로·세로 비율, 0~1)에서 아래로 퍼집니다. 0.05처럼 안쪽 값을 주면
// 빛이 모이는 점이 화면 안에 보여서, 공중에 조명이 매달린 것처럼 됩니다.
function anchorAndDir(origin: RaysOrigin, width: number, height: number, point?: { x: number; y: number }) {
  if (point) return { anchor: [point.x * width, point.y * height], dir: [0, 1] }
  const outside = .2
  switch (origin) {
    case 'top-left': return { anchor: [0, -outside * height], dir: [0, 1] }
    case 'top-right': return { anchor: [width, -outside * height], dir: [0, 1] }
    case 'left': return { anchor: [-outside * width, .5 * height], dir: [1, 0] }
    case 'right': return { anchor: [(1 + outside) * width, .5 * height], dir: [-1, 0] }
    case 'bottom-left': return { anchor: [0, (1 + outside) * height], dir: [0, -1] }
    case 'bottom-center': return { anchor: [.5 * width, (1 + outside) * height], dir: [0, -1] }
    case 'bottom-right': return { anchor: [width, (1 + outside) * height], dir: [0, -1] }
    default: return { anchor: [.5 * width, -outside * height], dir: [0, 1] }
  }
}

function compile(gl: WebGLRenderingContext) {
  const program = gl.createProgram()
  if (!program) return null
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    gl.attachShader(program, shader)
    gl.deleteShader(shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return program
}

export default function LightRays({
  raysOrigin = 'top-center',
  raysColor = '#ffffff',
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  saturation = 1,
  intensity = 1,
  mouseInfluence = .1,
  originPoint,
  className = '',
}: {
  raysOrigin?: RaysOrigin
  /** 빛이 모이는 자리를 직접 정합니다(가로·세로 비율 0~1). 주면 raysOrigin 대신 이 자리를 씁니다. */
  originPoint?: { x: number; y: number }
  raysColor?: string
  raysSpeed?: number
  lightSpread?: number
  rayLength?: number
  saturation?: number
  /** 빛을 얼마나 진하게 올릴지. 밝은 배경 위에서는 1로는 보이지 않아 올려서 씁니다. */
  intensity?: number
  mouseInfluence?: number
  className?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: .5, y: .5 })
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = container.current
    if (!element || reducedMotion) return

    let scene: { draw: (time: number) => void; resize: () => void; dispose: () => void } | null = null
    let frame: number | null = null
    let prepared = false

    // WebGL 준비. 화면에 처음 보일 때 한 번만 부릅니다.
    const build = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl', {
        alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false,
      })
      if (!gl) return null
      const program = compile(gl)
      if (!program) return null
      element.appendChild(canvas)
      gl.useProgram(program)

      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      // 화면을 덮는 삼각형 하나. 사각형 두 장보다 계산이 적습니다.
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

      const at = (name: string) => gl.getUniformLocation(program, name)
      const iTime = at('iTime')
      const iResolution = at('iResolution')
      const rayPos = at('rayPos')
      const rayDir = at('rayDir')
      const mousePos = at('mousePos')

      const color = hexToRgb(raysColor)
      gl.uniform3f(at('raysColor'), color[0], color[1], color[2])
      gl.uniform1f(at('raysSpeed'), raysSpeed)
      gl.uniform1f(at('lightSpread'), lightSpread)
      gl.uniform1f(at('rayLength'), rayLength)
      gl.uniform1f(at('saturation'), saturation)
      gl.uniform1f(at('intensity'), intensity)
      gl.uniform1f(at('mouseInfluence'), mouseInfluence)
      gl.uniform2f(mousePos, .5, .5)
      gl.clearColor(0, 0, 0, 0)

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = Math.max(1, Math.round(element.clientWidth * dpr))
        const height = Math.max(1, Math.round(element.clientHeight * dpr))
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        gl.uniform2f(iResolution, width, height)
        const { anchor, dir } = anchorAndDir(raysOrigin, width, height, originPoint)
        gl.uniform2f(rayPos, anchor[0], anchor[1])
        gl.uniform2f(rayDir, dir[0], dir[1])
      }
      resize()

      const smooth = { x: .5, y: .5 }
      const draw = (time: number) => {
        gl.uniform1f(iTime, time * .001)
        if (mouseInfluence > 0) {
          // 마우스를 바로 따라가지 않고 천천히 따라옵니다(원본과 같은 0.92 감쇠).
          smooth.x += (pointer.current.x - smooth.x) * .08
          smooth.y += (pointer.current.y - smooth.y) * .08
          gl.uniform2f(mousePos, smooth.x, smooth.y)
        }
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }

      const dispose = () => {
        gl.deleteBuffer(buffer)
        gl.deleteProgram(program)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        canvas.remove()
      }

      return { draw, resize, dispose }
    }

    const loop = (time: number) => {
      scene?.draw(time)
      frame = requestAnimationFrame(loop)
    }

    // 보이면 그리고, 안 보이면 멈춥니다. WebGL은 버리지 않습니다.
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (!prepared) {
          prepared = true
          scene = build()
        }
        if (scene && frame == null) frame = requestAnimationFrame(loop)
      } else if (frame != null) {
        cancelAnimationFrame(frame)
        frame = null
      }
    }, { threshold: .1 })
    observer.observe(element)

    const resize = () => scene?.resize()
    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(element)

    const move = (event: MouseEvent) => {
      const box = element.getBoundingClientRect()
      if (!box.width || !box.height) return
      pointer.current = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
    }
    if (mouseInfluence > 0) window.addEventListener('mousemove', move)
    window.addEventListener('resize', resize)

    return () => {
      if (frame != null) cancelAnimationFrame(frame)
      observer.disconnect()
      sizeObserver.disconnect()
      window.removeEventListener('mousemove', move)
      window.removeEventListener('resize', resize)
      scene?.dispose()
    }
    // originPoint는 객체라 매번 새로 만들어지므로, 값만 꺼내 비교합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, saturation, intensity, mouseInfluence, originPoint?.x, originPoint?.y])

  return <div ref={container} className={`light-rays${className ? ` ${className}` : ''}`} aria-hidden="true" />
}
