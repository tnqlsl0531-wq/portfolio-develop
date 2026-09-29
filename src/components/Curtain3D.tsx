/*
 * BACKSTAGE 마지막 단체 사진을 덮고 있는 3D 벨벳 커튼
 * - 틀에 잘린 모양이 아니라 커튼 한 벌 전체가 보입니다:
 *   커튼 봉(양 끝 장식) + 위쪽 가림막(스웨그 3개 + 양옆으로 늘어진 자보) + 바닥 쪽으로 살짝 퍼지는 커튼 두 폭.
 * - 커튼은 늘 닫혀 있고, 평소에는 아주 느리게 숨 쉬듯 흔들리며, 마우스를 올리면(터치는 누르면) 주름이 살짝 찰랑거립니다.
 * - 커서 주변 원 안에서 커튼 너머 단체 사진이 보이는 효과는 CSS 마스크로 합니다(Backstage.css .backstage__curtain).
 * - 색은 페이지 아래 와인색 그라데이션(#502421)에 맞춘 짙은 와인 벨벳이고,
 *   벨벳 특유의 결 광택(sheen)과 위에서 비추는 따뜻한 조명으로 주름을 표현합니다.
 * - 화면 밖에서는 렌더링을 멈춥니다(active).
 * 모양·색·움직임을 바꾸려면 아래 CURTAIN, SHAPE 값을 조절하세요.
 */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const CURTAIN = {
  color: '#4a1519', // 벨벳 바탕색(짙은 와인, 페이지 아래 #502421과 어울리게)
  sheen: '#b8736a', // 주름 가장자리에 은은하게 도는 벨벳 광택 색
  valance: '#3c1014', // 위쪽 가림막 색(조금 더 어둡게)
  rod: '#7a5c38', // 커튼 봉 색(튀지 않는 짙은 앤티크 골드)
  folds: 6.5, // 한 폭의 주름 수(적을수록 굵고 깊은 주름)
  depth: 0.2, // 주름 깊이
  ripple: 1, // 마우스를 올렸을 때 찰랑거리는 세기(0 = 없음, 1 = 기본, 2 = 두 배)
  rippleIn: 0.35, // 찰랑거림이 시작되는 데 걸리는 시간(초, 대략)
  rippleOut: 1.1, // 마우스를 뗀 뒤 잦아드는 데 걸리는 시간(초, 대략)
}

// 캔버스 = 사진 틀(550 × 550)보다 사방 70씩 큰 690 × 690, 가운데가 사진 틀 가운데 (디자인 px ÷ 100 = 3D 단위)
const VIEW = { w: 6.9, h: 6.9 }
const FOV = 30
const DISTANCE = VIEW.h / 2 / Math.tan((FOV / 2) * (Math.PI / 180))
// 커튼 모양(3D 단위, 사진 틀은 가로·세로 -2.75 ~ 2.75)
export const SHAPE = {
  top: 2.92, // 커튼 윗단(봉 바로 아래)
  hem: -2.95, // 커튼 아랫단(사진 틀 아래로 약 20px)
  half: 2.95, // 커튼 절반 폭(윗부분)
  flare: 0.1, // 아래로 갈수록 바깥으로 살짝 퍼지는 정도
  valanceHalf: 3.08, // 가림막 절반 폭(커튼보다 조금 넓게)
  rodHalf: 3.18, // 봉 절반 폭(양 끝 장식은 그 바깥)
}
const PANEL = { nx: 150, ny: 80 }

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

type Motion = { current: number }

/** 커튼 한 폭. side -1 = 왼쪽, 1 = 오른쪽 */
function Drape({ side, hover, material }: { side: -1 | 1; hover: Motion; material: THREE.Material }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, PANEL.nx, PANEL.ny), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const seed = side === -1 ? 0.37 : 1.91

  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    const h = hover.current * CURTAIN.ripple
    const positions = geometry.attributes.position as THREE.BufferAttribute
    const inner = side * -0.08 // 가운데서 살짝 겹치게(흔들려도 틈이 생기지 않도록)
    for (let j = 0; j <= PANEL.ny; j++) {
      const v = j / PANEL.ny // 0 = 위, 1 = 아래
      const outer = side * (SHAPE.half + SHAPE.flare * v * v) // 아래로 갈수록 바깥으로 살짝 퍼짐
      const header = 0.55 + 0.45 * smooth(v / 0.06) // 맨 위 주름은 조금 얕게 잡힘
      // 아래로 갈수록 주름이 살짝 넓고 깊어집니다(천의 무게).
      const amplitude = CURTAIN.depth * (0.8 + 0.35 * v) * header
      // 좌우 흔들림은 두 폭이 같은 방향으로 움직여서 가운데가 벌어지지 않습니다. 아래쪽일수록 많이 흔들립니다.
      const idleSway = Math.sin(time * 0.7 + v * 1.6) * 0.03 * v * v
      const hoverSway = h * 0.05 * v * v * Math.sin(time * 1.9 + v * 2.2)
      // 찰랑거림: 주름 자리가 아래쪽에서 조금씩 좌우로 밀렸다 돌아옵니다(빛 결이 흐르듯 반짝임).
      const drift = h * 0.32 * Math.pow(v, 1.4) * Math.sin(time * 2.3 + v * 3.1 + seed)
      for (let i = 0; i <= PANEL.nx; i++) {
        const u = i / PANEL.nx // 0 = 바깥쪽, 1 = 가운데 쪽
        // 주름 간격을 조금씩 다르게(손으로 친 커튼처럼 자연스럽게)
        const phase = (u * CURTAIN.folds + 0.18 * Math.sin(u * 5.3 + seed * 3) + 0.05 * v * Math.sin(u * 9 + seed)) * Math.PI * 2 + seed + drift
        const fold = Math.sin(phase) * (0.9 + 0.1 * Math.sin(u * 13 + seed))
        // 바깥 끝은 벽 쪽으로 살짝 말려 들어가 두께감이 생깁니다.
        const turn = -0.12 * (1 - smooth(u / 0.035))
        const x = outer + (inner - outer) * u + (idleSway + hoverSway) * u
        // 아랫단은 주름을 따라 아주 살짝 물결칩니다.
        const y = SHAPE.top - v * (SHAPE.top - SHAPE.hem) - 0.03 * fold * Math.pow(v, 8)
        // 위에서 아래로 흘러내리는 잔물결(마우스를 올렸을 때만)
        const ripple = h * 0.045 * v * Math.sin(u * 8 + v * 9 - time * 3.2 + seed)
        const z = amplitude * fold + turn + Math.sin(time * 0.9 + u * 4 + seed) * 0.015 * v + ripple
        positions.setXYZ(j * (PANEL.nx + 1) + i, x, y, z)
      }
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return <mesh geometry={geometry} material={material} />
}

/** 위쪽 가림막: 둥글게 늘어진 세 개의 스웨그(가운데가 조금 더 깊게) + 스웨그를 따라 휘는 가로 주름 */
function Valance({ material }: { material: THREE.Material }) {
  const geometry = useMemo(() => {
    const nx = 240
    const ny = 40
    const g = new THREE.PlaneGeometry(1, 1, nx, ny)
    const p = g.attributes.position as THREE.BufferAttribute
    const top = SHAPE.top + 0.04
    for (let j = 0; j <= ny; j++) {
      const v = j / ny
      for (let i = 0; i <= nx; i++) {
        const u = i / nx
        const x = (u * 2 - 1) * SHAPE.valanceHalf
        // 스웨그 하나 안에서 0 → 1 → 0 으로 둥글게(포물선) 늘어짐
        const local = (u * 3) % 1
        const sag = 1 - (2 * local - 1) ** 2
        const centre = u > 1 / 3 && u < 2 / 3 ? 1.12 : 1
        const depth = 0.62 + 0.3 * sag * centre
        const y = top - v * depth
        // 가로 주름이 스웨그 곡선을 따라 휘어짐 + 아래로 갈수록 앞으로 살짝 불룩
        const pleat = Math.sin((v * 3.4 - 0.18 * sag) * Math.PI * 2)
        const z = 0.3 + 0.035 * pleat * (0.4 + 0.6 * v) + 0.1 * Math.sin(v * Math.PI) * sag
        p.setXYZ(j * (nx + 1) + i, x, y, z)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} />
}

/** 가림막 양 끝에 세로로 늘어진 자보(cascade): 바깥쪽이 더 길게 비스듬히 떨어지는 주름 천 */
function Jabot({ side, material }: { side: -1 | 1; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const nx = 60
    const ny = 50
    const width = 0.46
    const g = new THREE.PlaneGeometry(1, 1, nx, ny)
    const p = g.attributes.position as THREE.BufferAttribute
    const top = SHAPE.top + 0.05
    for (let j = 0; j <= ny; j++) {
      const v = j / ny
      for (let i = 0; i <= nx; i++) {
        const u = i / nx // 0 = 바깥쪽, 1 = 안쪽
        const x = side * (SHAPE.valanceHalf + 0.02 - u * width)
        const length = 1.55 - 0.55 * u // 바깥쪽 1.55 → 안쪽 1.0
        const y = top - v * length
        const pleat = Math.sin(u * Math.PI * 2 * 2.5 + 0.4)
        const z = 0.42 + 0.06 * pleat * (0.5 + 0.5 * v) - 0.05 * (1 - smooth(u / 0.08))
        p.setXYZ(j * (nx + 1) + i, x, y, z)
      }
    }
    g.computeVertexNormals()
    return g
  }, [side])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} />
}

/** 커튼 봉 + 양 끝 둥근 장식 */
function Rod({ material }: { material: THREE.Material }) {
  const y = SHAPE.top + 0.1
  return (
    <group position={[0, y, 0.22]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={material}>
        <cylinderGeometry args={[0.032, 0.032, SHAPE.rodHalf * 2, 20]} />
      </mesh>
      {[-1, 1].map(side => (
        <group key={side} position={[side * (SHAPE.rodHalf + 0.05), 0, 0]}>
          <mesh material={material}>
            <sphereGeometry args={[0.068, 24, 16]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-side * 0.07, 0, 0]} material={material}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Scene({ hover, onReady }: { hover: boolean; onReady?: () => void }) {
  const level = useRef(0) // 지금 찰랑거리는 정도(0~1), 부드럽게 따라갑니다.
  const target = useRef(0)
  const readySent = useRef(false)
  useEffect(() => { target.current = hover ? 1 : 0 }, [hover])

  const velvet = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: CURTAIN.color, roughness: 0.9, metalness: 0,
    sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(CURTAIN.sheen),
    side: THREE.DoubleSide,
  }), [])
  const valanceMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: CURTAIN.valance, roughness: 0.85, metalness: 0,
    sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(CURTAIN.sheen),
    side: THREE.DoubleSide,
  }), [])
  const rodMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: CURTAIN.rod, roughness: 0.42, metalness: 0.45 }), [])
  useEffect(() => () => { velvet.dispose(); valanceMaterial.dispose(); rodMaterial.dispose() }, [velvet, valanceMaterial, rodMaterial])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20)
    const seconds = target.current > level.current ? CURTAIN.rippleIn : CURTAIN.rippleOut
    level.current += (target.current - level.current) * (1 - Math.exp(-delta / (seconds / 3)))
    if (!readySent.current) {
      readySent.current = true
      onReady?.()
    }
  })

  return (
    <>
      <ambientLight intensity={0.3} color="#ffe6d8" />
      {/* 위에서 비추는 따뜻한 무대 조명(살짝 왼쪽에서 비춰 주름 결이 드러나게) */}
      <spotLight position={[-3, 5, 6]} angle={0.7} penumbra={1} intensity={110} decay={2} color="#ffd9bf" />
      <directionalLight position={[4, 2, 3]} intensity={0.25} color="#ffc9bb" />
      <Rod material={rodMaterial} />
      <Drape side={-1} hover={level} material={velvet} />
      <Drape side={1} hover={level} material={velvet} />
      <Valance material={valanceMaterial} />
      <Jabot side={-1} material={valanceMaterial} />
      <Jabot side={1} material={valanceMaterial} />
    </>
  )
}

export default function Curtain3D({ hover, active, onReady }: { hover: boolean; active: boolean; onReady?: () => void }) {
  return (
    <Canvas
      className="backstage__curtain-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: FOV, position: [0, 0, DISTANCE], near: 0.1, far: 100 }}
      aria-hidden="true"
    >
      <Scene hover={hover} onReady={onReady} />
    </Canvas>
  )
}
