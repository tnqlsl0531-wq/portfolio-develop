/*
 * 커서를 따라 물감이 번지는 효과 (React Bits Splash Cursor)
 * 원본: https://reactbits.dev/animations/splash-cursor
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Animations/SplashCursor
 *       (유체 계산은 Pavel Dobryakov의 WebGL Fluid Simulation을 바탕으로 함)
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 값: 사용자가 준 React Bits 설정 그대로(SPLASH)
 *   DENSITY_DISSIPATION 8.5 · CURL 0 · COLOR_UPDATE_SPEED 24 · SPLAT_RADIUS 0.65 · VELOCITY_DISSIPATION 4
 *   COLOR #FC7A73(한 가지 색) · PRESSURE 0 · SHADING 끔 · SPLAT_FORCE 5500
 *
 * 원본에서 바꾼 점
 * - 효과가 나오는 곳: startBelow 요소(히어로 아래 물결) 아래부터. startEdge를 주면 그 요소 안의 경계선(물결의 검은 부분 아래 선)을 따라
 *   흰 부분부터 나옵니다. 그 위(히어로·검은 물결)에서는 물감을 만들지 않고, 번진 물감도 경계선 위로는 안 보이게 잘라 냅니다.
 *   10/1: 경계선에서 칼로 자른 듯 끊겨 보여서, 경계선 아래 SOFT_EDGE만큼은 마스크로 서서히 보이게(은근히 스며들게) 바꿨습니다.
 * - fadeInto 요소(Contact)가 화면에 들어오면 스크롤한 만큼 서서히 투명해지고(FADE), 다 들어오면 사라집니다. 그 안에서는 물감을 만들지 않습니다.
 * - 시작 요소(지금은 Stage Works)가 끝나 갈 때부터 스크롤한 만큼 서서히 나타납니다(FADE_IN).
 * - data-cursor-quiet 표시가 있는 곳(목차 프로그램북) 위에서는 물감을 만들지 않습니다.
 * - 효과가 안 보일 때(히어로만 보이거나 Contact에 다 들어왔을 때)는 계산을 멈춰 컴퓨터를 덜 씁니다.
 * - 작품 선택 창·BACKSTAGE·아카이브처럼 창(dialog)이 열려 있을 때는 물감을 만들지 않습니다.
 * - 화면에서 사라질 때 이벤트·애니메이션·WebGL을 정리합니다(원본은 정리하지 않음).
 * - 가볍게(10/1, 발표 때 Zoom으로 공유하면 더 느려져서): 마우스가 멈추고 물감이 다 사라지면(QUALITY.idleMs) 계산을 완전히 멈추고
 *   레이어도 숨깁니다(원본은 가만히 있어도 매 프레임 전체 화면을 계산). 마우스가 다시 움직이면 바로 이어서 나옵니다.
 *   물감이 원래 뿌옇게 번지는 효과라 절반 해상도로 계산·그려도 눈으로는 거의 같아서 해상도를 낮췄고(QUALITY.renderScale, DYE_RESOLUTION),
 *   CURL 0이라 아무 일도 안 하는 소용돌이 계산 두 단계는 건너뜁니다.
 * - 마우스(정밀 포인터)가 있는 기기에서만 켭니다(App.tsx). 터치 기기·동작 줄이기 설정에서는 나오지 않습니다.
 */
import { useEffect, useRef } from 'react'
import './SplashCursor.css'

const SPLASH = {
  SIM_RESOLUTION: 128,
  // 물감 해상도(세로 칸 수). 원본 1440 → 540(10/1 가볍게). 물감이 부드럽게 번지는 효과라 차이가 거의 안 보입니다.
  DYE_RESOLUTION: 540,
  DENSITY_DISSIPATION: 8.5,
  VELOCITY_DISSIPATION: 4,
  PRESSURE: 0,
  PRESSURE_ITERATIONS: 20,
  CURL: 0,
  SPLAT_RADIUS: 0.65,
  SPLAT_FORCE: 5500,
  SHADING: false,
  COLOR_UPDATE_SPEED: 24,
  COLOR: '#FC7A73',
}

// Contact(fadeInto)가 들어올 때 사라지는 구간(화면 높이 대비 Contact 윗선 위치): start에서 흐려지기 시작해 end에서 완전히 사라짐.
// 1 = Contact 윗선이 화면 아래 끝에 막 닿았을 때, 0.3 = 화면 위에서 30% 지점까지 올라왔을 때. 스크롤한 만큼 조금씩 흐려집니다.
const FADE = { start: 1, end: 0.3 }

// 시작 요소(Stage Works)가 끝나 갈 때 서서히 나타나는 구간(화면 높이 대비 시작 요소 아랫선 위치):
// 1 = Stage Works 아랫선이 화면 아래 끝에 닿을 때부터 나타나기 시작, 0.45 = 화면 위에서 45% 지점까지 올라오면 다 나타남.
// Stage Works 안(아랫선 위)에서는 물감을 만들지 않고 보이지도 않습니다.
const FADE_IN = { start: 1, end: 0.45 }

// 시작 요소(Stage Works) 아랫선에서 칼로 자른 듯 끊겨 보이지 않게(10/1), 아랫선부터 화면 높이의 이 비율만큼 내려가며 서서히 보이게 합니다.
// 숫자가 클수록 더 은근하게(길게) 나타납니다.
const SOFT_EDGE = 0.24

// 물감 전체 불투명도(0~1). 마우스를 한곳에서 오래 움직여 물감이 짙게 쌓여도 뒤 내용이 비쳐 보이도록 낮췄습니다(원래 1).
// 더 옅게 하려면 숫자를 줄이고, 더 진하게 하려면 늘리세요.
const OPACITY = 0.5

/* 가볍게(10/1)
   renderScale: 화면 크기 대비 그리는 해상도(0.5 = 가로세로 절반 → 픽셀 수 1/4). 물감 가장자리가 원래 뿌옇기 때문에 티가 안 납니다.
   idleMs     : 마지막으로 물감을 만든 뒤 이만큼(ms) 지나면 계산을 완전히 멈춥니다(그때쯤이면 물감이 다 사라져 있음). */
const QUALITY = { renderScale: 0.5, idleMs: 1400 }

type ColorRGB = { r: number; g: number; b: number }
type Pointer = {
  texcoordX: number; texcoordY: number; prevTexcoordX: number; prevTexcoordY: number
  deltaX: number; deltaY: number; moved: boolean; color: ColorRGB
}
type TextureFormat = { internalFormat: number; format: number }
type FBO = {
  texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number
  texelSizeX: number; texelSizeY: number; attach: (id: number) => number
}
type DoubleFBO = {
  width: number; height: number; texelSizeX: number; texelSizeY: number
  read: FBO; write: FBO; swap: () => void
}
type GL = WebGLRenderingContext | WebGL2RenderingContext

function getWebGLContext(canvas: HTMLCanvasElement) {
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false }
  const gl2 = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null
  const gl: GL | null = gl2 ?? (canvas.getContext('webgl', params) as WebGLRenderingContext | null)
  if (!gl) return null
  const isWebGL2 = gl2 !== null

  let supportLinearFiltering = false
  let halfFloat: OES_texture_half_float | null = null
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float')
    supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear')
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float')
    supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear')
  }
  gl.clearColor(0, 0, 0, 1)
  const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : (halfFloat?.HALF_FLOAT_OES ?? 0)

  let formatRGBA: TextureFormat | null
  let formatRG: TextureFormat | null
  let formatR: TextureFormat | null
  if (isWebGL2) {
    const g = gl as WebGL2RenderingContext
    formatRGBA = getSupportedFormat(g, g.RGBA16F, g.RGBA, halfFloatTexType)
    formatRG = getSupportedFormat(g, g.RG16F, g.RG, halfFloatTexType)
    formatR = getSupportedFormat(g, g.R16F, g.RED, halfFloatTexType)
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
  }
  if (!formatRGBA || !formatRG || !formatR) return null
  return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } }
}

function getSupportedFormat(gl: GL, internalFormat: number, format: number, type: number): TextureFormat | null {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    if ('drawBuffers' in gl) {
      switch (internalFormat) {
        case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type)
        case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type)
        default: return null
      }
    }
    return null
  }
  return { internalFormat, format }
}

function supportRenderTextureFormat(gl: GL, internalFormat: number, format: number, type: number) {
  const texture = gl.createTexture()
  if (!texture) return false
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null)
  const fbo = gl.createFramebuffer()
  if (!fbo) return false
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
}

function hashCode(s: string) {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function hexToRGB(hex: string): ColorRGB {
  let value = hex.replace('#', '')
  if (value.length === 3) value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2]
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  return { r: r * 0.15, g: g * 0.15, b: b * 0.15 }
}

const baseVertexSource = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;

  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const copySource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;

  void main () {
      gl_FragColor = texture2D(uTexture, vUv);
  }
`

const clearSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;

  void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
  }
`

const displaySource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform sampler2D uDithering;
  uniform vec2 ditherScale;
  uniform vec2 texelSize;

  vec3 linearToGamma (vec3 color) {
      color = max(color, vec3(0));
      return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
  }

  void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      #ifdef SHADING
          vec3 lc = texture2D(uTexture, vL).rgb;
          vec3 rc = texture2D(uTexture, vR).rgb;
          vec3 tc = texture2D(uTexture, vT).rgb;
          vec3 bc = texture2D(uTexture, vB).rgb;

          float dx = length(rc) - length(lc);
          float dy = length(tc) - length(bc);

          vec3 n = normalize(vec3(dx, dy, length(texelSize)));
          vec3 l = vec3(0.0, 0.0, 1.0);

          float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
          c *= diffuse;
      #endif

      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a);
  }
`

const splatSource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;

  void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
  }
`

const advectionSource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;

  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);

      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }

  void main () {
      #ifdef MANUAL_FILTERING
          vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
          vec4 result = bilerp(uSource, coord, dyeTexelSize);
      #else
          vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
          vec4 result = texture2D(uSource, coord);
      #endif
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
  }
`

const divergenceSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;

      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }

      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`

const curlSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`

const vorticitySource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;

      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;

      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

const pressureSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float C = texture2D(uPressure, vUv).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`

const gradientSubtractSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

/**
 * startBelow: 이 요소 아래부터 효과가 나옵니다.
 * startEdge: startBelow 요소 안의 경계선. 가로 위치(요소 폭 대비 0~1)를 받아 그 자리 경계선 높이(요소 높이 대비 0~1)를 돌려줍니다.
 *            없으면 요소 아래 끝(1)이 경계선입니다.
 * fadeInto: 이 요소(Contact)가 화면에 들어오면 서서히 사라집니다.
 */
export default function SplashCursor({ startBelow, startEdge, fadeInto }: {
  startBelow: string
  startEdge?: (x: number) => number
  fadeInto: string
}) {
  const layer = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = layer.current
    if (!canvas || !overlay) return
    const context = getWebGLContext(canvas)
    if (!context) return
    const { gl, ext } = context
    const config = { ...SPLASH }
    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = 256
      config.SHADING = false
    }

    const compileShader = (type: number, source: string, keywords: string[] | null = null) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, (keywords ?? []).map(keyword => `#define ${keyword}\n`).join('') + source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader))
      return shader
    }
    const createProgram = (vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) => {
      if (!vertexShader || !fragmentShader) return null
      const program = gl.createProgram()
      if (!program) return null
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(program))
      return program
    }
    const getUniforms = (program: WebGLProgram) => {
      const uniforms: Record<string, WebGLUniformLocation | null> = {}
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i)
        if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name)
      }
      return uniforms
    }

    class Program {
      program: WebGLProgram | null
      uniforms: Record<string, WebGLUniformLocation | null>
      constructor(vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) {
        this.program = createProgram(vertexShader, fragmentShader)
        this.uniforms = this.program ? getUniforms(this.program) : {}
      }
      bind() { if (this.program) gl.useProgram(this.program) }
    }

    class Material {
      vertexShader: WebGLShader | null
      fragmentShaderSource: string
      programs: Record<number, WebGLProgram | null> = {}
      activeProgram: WebGLProgram | null = null
      uniforms: Record<string, WebGLUniformLocation | null> = {}
      constructor(vertexShader: WebGLShader | null, fragmentShaderSource: string) {
        this.vertexShader = vertexShader
        this.fragmentShaderSource = fragmentShaderSource
      }
      setKeywords(keywords: string[]) {
        let hash = 0
        for (const keyword of keywords) hash += hashCode(keyword)
        let program = this.programs[hash]
        if (program == null) {
          program = createProgram(this.vertexShader, compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords))
          this.programs[hash] = program
        }
        if (program === this.activeProgram) return
        if (program) this.uniforms = getUniforms(program)
        this.activeProgram = program
      }
      bind() { if (this.activeProgram) gl.useProgram(this.activeProgram) }
    }

    const baseVertexShader = compileShader(gl.VERTEX_SHADER, baseVertexSource)
    const copyProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, copySource))
    const clearProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, clearSource))
    const splatProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, splatSource))
    const advectionProgram = new Program(baseVertexShader,
      compileShader(gl.FRAGMENT_SHADER, advectionSource, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']))
    const divergenceProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, divergenceSource))
    const curlProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, curlSource))
    const vorticityProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, vorticitySource))
    const pressureProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, pressureSource))
    const gradientSubtractProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, gradientSubtractSource))
    const displayMaterial = new Material(baseVertexShader, displaySource)

    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const quadIndices = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndices)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    const blit = (target: FBO | null, doClear = false) => {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      } else {
        gl.viewport(0, 0, target.width, target.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      }
      if (doClear) {
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }

    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
      gl.activeTexture(gl.TEXTURE0)
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return {
        texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id)
          gl.bindTexture(gl.TEXTURE_2D, texture)
          return id
        },
      }
    }
    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
      const fbo1 = createFBO(w, h, internalFormat, format, type, param)
      const fbo2 = createFBO(w, h, internalFormat, format, type, param)
      return {
        width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY, read: fbo1, write: fbo2,
        swap() {
          const temp = this.read
          this.read = this.write
          this.write = temp
        },
      }
    }
    function resizeFBO(target: FBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      const next = createFBO(w, h, internalFormat, format, type, param)
      copyProgram.bind()
      if (copyProgram.uniforms.uTexture) gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0))
      blit(next, false)
      return next
    }
    function resizeDoubleFBO(target: DoubleFBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      if (target.width === w && target.height === h) return target
      target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param)
      target.write = createFBO(w, h, internalFormat, format, type, param)
      target.width = w
      target.height = h
      target.texelSizeX = 1 / w
      target.texelSizeY = 1 / h
      return target
    }

    let dye!: DoubleFBO
    let velocity!: DoubleFBO
    let divergence!: FBO
    let curl!: FBO
    let pressure!: DoubleFBO

    function getResolution(resolution: number) {
      const w = gl.drawingBufferWidth
      const h = gl.drawingBufferHeight
      const aspectRatio = w / h
      const aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio
      const min = Math.round(resolution)
      const max = Math.round(resolution * aspect)
      return w > h ? { width: max, height: min } : { width: min, height: max }
    }
    function initFramebuffers() {
      const simRes = getResolution(config.SIM_RESOLUTION)
      const dyeRes = getResolution(config.DYE_RESOLUTION)
      const texType = ext.halfFloatTexType
      const rgba = ext.formatRGBA
      const rg = ext.formatRG
      const r = ext.formatR
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
      gl.disable(gl.BLEND)
      dye = dye
        ? resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
        : createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
      velocity = velocity
        ? resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
        : createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
      divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
      curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
    }

    // 그리는 해상도: 화면(CSS px)의 QUALITY.renderScale배(화면 배율과 상관없이). 화면에는 늘여서 보여 줍니다.
    const scaleToRender = (input: number) => Math.max(1, Math.floor(input * QUALITY.renderScale))
    function resizeCanvas() {
      const width = scaleToRender(canvas!.clientWidth)
      const height = scaleToRender(canvas!.clientHeight)
      if (canvas!.width === width && canvas!.height === height) return false
      canvas!.width = width
      canvas!.height = height
      return true
    }

    displayMaterial.setKeywords(config.SHADING ? ['SHADING'] : [])
    resizeCanvas()
    initFramebuffers()

    const pointer: Pointer = {
      texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, moved: false,
      color: hexToRGB(config.COLOR),
    }
    const generateColor = () => hexToRGB(config.COLOR)
    let colorUpdateTimer = 0

    function step(dt: number) {
      gl.disable(gl.BLEND)

      // 소용돌이(CURL)가 0이면 이 두 단계는 속도를 그대로 베끼기만 하므로 건너뜁니다(결과는 같고 계산만 줄어듦).
      if (config.CURL !== 0) {
        curlProgram.bind()
        gl.uniform2f(curlProgram.uniforms.texelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
        gl.uniform1i(curlProgram.uniforms.uVelocity ?? null, velocity.read.attach(0))
        blit(curl)

        vorticityProgram.bind()
        gl.uniform2f(vorticityProgram.uniforms.texelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
        gl.uniform1i(vorticityProgram.uniforms.uVelocity ?? null, velocity.read.attach(0))
        gl.uniform1i(vorticityProgram.uniforms.uCurl ?? null, curl.attach(1))
        gl.uniform1f(vorticityProgram.uniforms.curl ?? null, config.CURL)
        gl.uniform1f(vorticityProgram.uniforms.dt ?? null, dt)
        blit(velocity.write)
        velocity.swap()
      }

      divergenceProgram.bind()
      gl.uniform2f(divergenceProgram.uniforms.texelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(divergenceProgram.uniforms.uVelocity ?? null, velocity.read.attach(0))
      blit(divergence)

      clearProgram.bind()
      gl.uniform1i(clearProgram.uniforms.uTexture ?? null, pressure.read.attach(0))
      gl.uniform1f(clearProgram.uniforms.value ?? null, config.PRESSURE)
      blit(pressure.write)
      pressure.swap()

      pressureProgram.bind()
      gl.uniform2f(pressureProgram.uniforms.texelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(pressureProgram.uniforms.uDivergence ?? null, divergence.attach(0))
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure ?? null, pressure.read.attach(1))
        blit(pressure.write)
        pressure.swap()
      }

      gradientSubtractProgram.bind()
      gl.uniform2f(gradientSubtractProgram.uniforms.texelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(gradientSubtractProgram.uniforms.uPressure ?? null, pressure.read.attach(0))
      gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity ?? null, velocity.read.attach(1))
      blit(velocity.write)
      velocity.swap()

      advectionProgram.bind()
      gl.uniform2f(advectionProgram.uniforms.texelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
      if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize ?? null, velocity.texelSizeX, velocity.texelSizeY)
      const velocityId = velocity.read.attach(0)
      gl.uniform1i(advectionProgram.uniforms.uVelocity ?? null, velocityId)
      gl.uniform1i(advectionProgram.uniforms.uSource ?? null, velocityId)
      gl.uniform1f(advectionProgram.uniforms.dt ?? null, dt)
      gl.uniform1f(advectionProgram.uniforms.dissipation ?? null, config.VELOCITY_DISSIPATION)
      blit(velocity.write)
      velocity.swap()

      if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize ?? null, dye.texelSizeX, dye.texelSizeY)
      gl.uniform1i(advectionProgram.uniforms.uVelocity ?? null, velocity.read.attach(0))
      gl.uniform1i(advectionProgram.uniforms.uSource ?? null, dye.read.attach(1))
      gl.uniform1f(advectionProgram.uniforms.dissipation ?? null, config.DENSITY_DISSIPATION)
      blit(dye.write)
      dye.swap()
    }

    function render() {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
      displayMaterial.bind()
      if (config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize ?? null, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight)
      gl.uniform1i(displayMaterial.uniforms.uTexture ?? null, dye.read.attach(0))
      blit(null, false)
    }

    const correctRadius = (radius: number) => {
      const aspectRatio = canvas.width / canvas.height
      return aspectRatio > 1 ? radius * aspectRatio : radius
    }
    function splat(x: number, y: number, dx: number, dy: number, color: ColorRGB) {
      splatProgram.bind()
      gl.uniform1i(splatProgram.uniforms.uTarget ?? null, velocity.read.attach(0))
      gl.uniform1f(splatProgram.uniforms.aspectRatio ?? null, canvas!.width / canvas!.height)
      gl.uniform2f(splatProgram.uniforms.point ?? null, x, y)
      gl.uniform3f(splatProgram.uniforms.color ?? null, dx, dy, 0)
      gl.uniform1f(splatProgram.uniforms.radius ?? null, correctRadius(config.SPLAT_RADIUS / 100))
      blit(velocity.write)
      velocity.swap()

      gl.uniform1i(splatProgram.uniforms.uTarget ?? null, dye.read.attach(0))
      gl.uniform3f(splatProgram.uniforms.color ?? null, color.r, color.g, color.b)
      blit(dye.write)
      dye.swap()
    }
    const splatPointer = () => splat(pointer.texcoordX, pointer.texcoordY,
      pointer.deltaX * config.SPLAT_FORCE, pointer.deltaY * config.SPLAT_FORCE, pointer.color)
    function clickSplat() {
      const color = generateColor()
      color.r *= 10
      color.g *= 10
      color.b *= 10
      splat(pointer.texcoordX, pointer.texcoordY, 10 * (Math.random() - 0.5), 30 * (Math.random() - 0.5), color)
    }

    const correctDeltaX = (delta: number) => {
      const aspectRatio = canvas.width / canvas.height
      return aspectRatio < 1 ? delta * aspectRatio : delta
    }
    const correctDeltaY = (delta: number) => {
      const aspectRatio = canvas.width / canvas.height
      return aspectRatio > 1 ? delta / aspectRatio : delta
    }
    function movePointer(clientX: number, clientY: number) {
      pointer.prevTexcoordX = pointer.texcoordX
      pointer.prevTexcoordY = pointer.texcoordY
      pointer.texcoordX = clientX / Math.max(1, canvas!.clientWidth)
      pointer.texcoordY = 1 - clientY / Math.max(1, canvas!.clientHeight)
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX)
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY)
    }

    // ── 효과가 나오는 곳(히어로 아래 ~ Contact 앞)과 서서히 사라지기 ──
    const start = document.querySelector(startBelow)
    const end = document.querySelector(fadeInto)
    const edgeAt = startEdge ?? (() => 1)
    const EDGE_STEPS = 48
    // box: 시작 요소(물결)의 화면 위치, top: 경계선 중 가장 높은 곳(화면 기준)
    const region = { box: new DOMRect(0, 0, window.innerWidth, 0), top: 0, bottom: window.innerHeight, fade: 1 }
    let appliedClip = ''
    let appliedMask = ''
    let appliedOpacity = ''
    const quiet = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-cursor-quiet]')
    const edgeY = (clientX: number) => {
      const box = region.box
      return box.top + edgeAt(box.width ? (clientX - box.left) / box.width : 0) * box.height
    }
    function measureRegion() {
      const height = window.innerHeight
      region.box = start ? start.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, 0)
      region.bottom = end ? end.getBoundingClientRect().top : height
      const fade = (region.bottom - FADE.end * height) / ((FADE.start - FADE.end) * height)
      const startBottom = region.box.bottom
      const fadeIn = (FADE_IN.start * height - startBottom) / ((FADE_IN.start - FADE_IN.end) * height)
      region.fade = Math.min(1, Math.max(0, fade)) * Math.min(1, Math.max(0, fadeIn))
      // 경계선(물결의 흰 부분 윗선)을 따라 그 위로는 번진 물감도 보이지 않게 잘라 냅니다.
      const box = region.box
      const points: string[] = []
      let top = Infinity
      let lowest = -Infinity
      for (let i = 0; i <= EDGE_STEPS; i++) {
        const x = box.left + (i / EDGE_STEPS) * box.width
        const y = box.top + edgeAt(i / EDGE_STEPS) * box.height
        top = Math.min(top, y)
        lowest = Math.max(lowest, y)
        points.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`)
      }
      region.top = top
      const floor = Math.max(height, lowest) + 1
      // 물결 모양 경계선(startEdge)일 때만 그 모양대로 자릅니다. 경계선이 화면 위로 완전히 올라가 있으면 자를 곳이 없으니 자르지 않습니다.
      const clip = !startEdge || lowest <= 0 ? 'none'
        : `polygon(${points.join(', ')}, ${box.right.toFixed(1)}px ${floor}px, ${box.left.toFixed(1)}px ${floor}px)`
      if (clip !== appliedClip) {
        appliedClip = clip
        overlay!.style.clipPath = clip
      }
      // 경계선(가장 높은 곳)에서는 투명 → SOFT_EDGE만큼 아래에서 다 보이게: 물감이 경계선 쪽으로 번져도 뚝 끊기지 않고 스며들듯 사라집니다.
      const soft = SOFT_EDGE * height
      const mask = top + soft <= 0 ? 'none'
        : `linear-gradient(to bottom, transparent ${top.toFixed(0)}px, rgb(0 0 0 / 22%) ${(top + soft * .45).toFixed(0)}px, #000 ${(top + soft).toFixed(0)}px)`
      if (mask !== appliedMask) {
        appliedMask = mask
        overlay!.style.setProperty('mask-image', mask)
        overlay!.style.setProperty('-webkit-mask-image', mask)
      }
      // 전체 불투명도(OPACITY) × Stage Works가 끝나 갈수록 나타나게(FADE_IN) × Contact가 들어올수록 투명하게(FADE)
      const opacity = String(region.fade * OPACITY)
      if (opacity !== appliedOpacity) {
        appliedOpacity = opacity
        overlay!.style.opacity = opacity
      }
    }
    // 물감을 만들어도 되는 자리인지: 경계선(물결의 흰 부분) 아래, Contact 위, 창(dialog)이 열려 있지 않을 때
    const canPaint = (clientX: number, clientY: number) =>
      region.fade > 0 && clientY >= edgeY(clientX) && clientY < region.bottom && !document.querySelector('dialog[open]')

    // ── 계산 켜고 끄기(10/1 가볍게) ──
    // 마우스를 움직여 물감을 만들 때만 계산을 돌리고, 마지막 물감 뒤 QUALITY.idleMs가 지나면(물감이 다 사라짐) 깨끗이 지우고 멈춥니다.
    // 멈춰 있는 동안에는 레이어도 숨겨서 화면 합성에서도 빠집니다.
    let frame = 0
    let lastTime = 0
    let lastPaint = -Infinity
    let dirty = false // 지워야 할 물감이 남아 있는지
    let regionDirty = true
    const markDirty = () => { regionDirty = true }
    const refreshRegion = () => {
      if (!regionDirty) return
      regionDirty = false
      measureRegion()
    }
    function clearAll() {
      gl.disable(gl.BLEND)
      gl.clearColor(0, 0, 0, 0)
      for (const target of [dye.read, dye.write, velocity.read, velocity.write, pressure.read, pressure.write]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
        gl.viewport(0, 0, target.width, target.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.clearColor(0, 0, 0, 1)
      dirty = false
      showLayer(false)
    }
    let layerShown = true
    const showLayer = (show: boolean) => {
      if (show === layerShown) return
      layerShown = show
      overlay!.style.visibility = show ? '' : 'hidden'
    }
    function wake() {
      if (frame) return
      lastTime = 0
      frame = requestAnimationFrame(update)
    }
    function update(now: number) {
      frame = 0
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.016666) : 0.016666
      lastTime = now
      refreshRegion()
      // 효과가 보이지 않을 때(히어로만 보이거나 Contact에 다 들어왔을 때)는 지우고 멈춥니다.
      if (region.fade <= 0 || region.top >= window.innerHeight) {
        if (dirty) clearAll()
        return
      }
      if (resizeCanvas()) initFramebuffers()
      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer %= 1
        pointer.color = generateColor()
      }
      if (pointer.moved) {
        pointer.moved = false
        splatPointer()
        lastPaint = now
        dirty = true
      }
      // 마지막 물감 뒤 한참 지나면 물감이 다 사라진 것이므로 깨끗이 지우고 멈춥니다(다음 마우스 움직임에 다시 켜짐).
      if (now - lastPaint > QUALITY.idleMs) {
        if (dirty) clearAll()
        return
      }
      showLayer(true)
      step(dt)
      render()
      frame = requestAnimationFrame(update)
    }

    function onMouseMove(event: MouseEvent) {
      refreshRegion()
      movePointer(event.clientX, event.clientY)
      pointer.moved = !quiet(event.target) && canPaint(event.clientX, event.clientY) && (Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0)
      if (pointer.moved) wake()
    }
    function onMouseDown(event: MouseEvent) {
      refreshRegion()
      movePointer(event.clientX, event.clientY)
      pointer.deltaX = 0
      pointer.deltaY = 0
      pointer.color = generateColor()
      if (quiet(event.target) || !canPaint(event.clientX, event.clientY)) return
      if (resizeCanvas()) initFramebuffers()
      clickSplat()
      lastPaint = performance.now()
      dirty = true
      wake()
    }
    // 물감이 남아 있는 동안 스크롤하면 잘라 내는 선·투명도를 다시 맞춰야 하므로 계산을 이어 갑니다.
    const onScroll = () => {
      regionDirty = true
      if (dirty) wake()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', markDirty)
    // 히어로 아래 물결이 스크롤에 따라 휘면(HeroCurve) 경계선을 다시 잽니다.
    window.addEventListener('hero-curve-change', markDirty)
    // 사진·글꼴이 늦게 불러와져 위치가 바뀌는 경우도 잡습니다.
    const layoutObserver = new ResizeObserver(markDirty)
    layoutObserver.observe(document.body)
    showLayer(false)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', markDirty)
      window.removeEventListener('hero-curve-change', markDirty)
      layoutObserver.disconnect()
    }
  }, [startBelow, startEdge, fadeInto])

  return (
    <div ref={layer} className="splash-cursor" aria-hidden="true">
      <canvas ref={canvasRef} className="splash-cursor__canvas" />
    </div>
  )
}
