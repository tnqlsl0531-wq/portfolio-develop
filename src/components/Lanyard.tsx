/*
 * 스태프 패스 목줄(3D) 애니메이션
 * 원본: React Bits Lanyard — https://reactbits.dev/components/lanyard
 *       https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/Lanyard
 * 라이선스: MIT + Commons Clause (src/licenses/React-Bits-LICENSE.md)
 *
 * 원본에서 바꾼 점
 * - 카드 앞·뒤를 피그마 스태프 패스 디자인으로 만든 텍스처(staff-pass-card.png)로 교체
 * - 목줄 텍스처를 피그마 목줄 색(#A3A3A3)으로 교체, 카드 모델에 들어 있던 원본 로고 텍스처는 제거
 * - 고리가 걸리는 작은 동그란 구멍을 막고, 피그마 '패스 구멍' 모양(가로로 긴 둥근 슬롯)으로 뚫음
 * - 카메라 거리와 목줄 고정점 높이를 Contact 섹션 배치에 맞춤
 * - 화면 밖에서는 물리 계산과 렌더링을 멈춤(active)
 * - 뒷면도 보이도록, 가만히 있을 때 카드가 천천히 돌아 뒷면을 보여주고 다시 앞면으로 돌아옴(SHOWCASE)
 * - 목줄 고정점을 캔버스 가운데가 아닌 곳에 둘 수 있음(anchorLeft) — 카드가 떨어질 때 잘리지 않게 캔버스를 한쪽으로 넓히기 위해
 * - 카드가 다 떨어져 자리를 잡으면 한 번 알려줌(onLanded, 기준은 LANDING) — 그 뒤에 Contact 제안서가 올라옴
 * - 카드 앞면의 이메일 글자를 누르면(끌지 않고 짧게 클릭) 알려줌(onEmailClick) — Contact에서 이메일을 복사하고 '복사되었습니다'를 띄움.
 *   이메일 위에 마우스를 올리면 손가락 커서가 됩니다. 누른 자리는 카드 그림의 좌표(uv)로 확인합니다(EMAIL_UV).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import type { ThreeElement, ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF, useTexture } from '@react-three/drei'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import type { RapierRigidBody, RigidBodyProps } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'
import cardModel from '../assets/lanyard/card.glb'
import cardTexture from '../assets/lanyard/staff-pass-card.png'
import cardCutout from '../assets/lanyard/staff-pass-card-cutout.png'
import strapTexture from '../assets/lanyard/strap.png'
import './Lanyard.css'

extend({ MeshLineGeometry, MeshLineMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
  }
}

interface LanyardProps {
  /** true일 때만 물리 계산·렌더링을 돌립니다. 섹션이 화면에 보일 때 켜주세요. */
  active?: boolean
  /** 카메라와 카드 사이 거리. 값이 작을수록 카드가 크게 보입니다. */
  cameraDistance?: number
  /** 목줄 고정점 높이(월드 단위). 카메라 위쪽 밖에 두면 목줄이 화면 위에서 내려옵니다. */
  anchorY?: number
  /** 목줄 고정점의 가로 위치(캔버스 폭 대비 0~1, 왼쪽 끝 = 0). 기본 0.5 = 가운데 */
  anchorLeft?: number
  /** 카드가 다 떨어져 자리를 잡았을 때 한 번 불립니다(기준: LANDING). */
  onLanded?: () => void
  /** 카드 앞면의 이메일을 클릭했을 때 불립니다(누른 화면 좌표). */
  onEmailClick?: (point: { x: number; y: number }) => void
  fov?: number
  gravity?: [number, number, number]
  lanyardWidth?: number
  onReady?: () => void
}

export default function Lanyard({
  active = true,
  cameraDistance = 11.6,
  anchorY = 4,
  anchorLeft = 0.5,
  fov = 20,
  gravity = [0, -40, 0],
  lanyardWidth = 1,
  onReady,
  onLanded,
  onEmailClick,
}: LanyardProps) {
  return (
    <div className="lanyard">
      <Canvas
        camera={{ position: [0, 0, cameraDistance], fov }}
        dpr={[1, 2]}
        flat
        frameloop={active ? 'always' : 'never'}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      >
        <ambientLight intensity={1} />
        <Physics gravity={gravity} timeStep={1 / 60} paused={!active}>
          <Band anchorY={anchorY} anchorLeft={anchorLeft} lanyardWidth={lanyardWidth} onReady={onReady} onLanded={onLanded} onEmailClick={onEmailClick} />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  )
}

type LerpedBody = RapierRigidBody & { lerped?: THREE.Vector3 }

// 뒷면 보여주기: 내려오고 firstBack초 뒤 처음 뒤집히고, 그다음부터는 앞면 front초 → 뒷면 back초를 반복합니다.
// 카드를 잡고 끄는 동안은 멈추고, 놓으면 앞면부터 다시 셉니다. stiffness가 클수록 빨리 돕니다.
const SHOWCASE = { firstBack: 1.8, front: 6, back: 3.5, stiffness: 10 }

// 착지로 보는 기준: 카드가 고정점에서 fallen(월드 단위)보다 아래까지 떨어진 뒤(줄 끝 = 약 4.5),
// 속도가 speed(월드 단위/초) 아래로 hold초 동안 머물면 '다 떨어져 자리를 잡았다'고 봅니다.
// speed를 낮추면 더 완전히 멈춘 뒤에, 높이면 더 일찍 제안서가 올라옵니다.
const LANDING = { fallen: 4, speed: 1.5, hold: 0.15 }

interface BandProps {
  anchorY: number
  anchorLeft: number
  lanyardWidth: number
  maxSpeed?: number
  minSpeed?: number
  onReady?: () => void
  onLanded?: () => void
  onEmailClick?: (point: { x: number; y: number }) => void
}

// 카드 그림(staff-pass-card.png, 2048px)에서 앞면 이메일 줄(글자 + 복사 아이콘)이 있는 자리를 그림 좌표(0~1)로 적은 값.
// 누르기 쉽게 글자 둘레로 조금(약 12px) 넉넉하게 잡았습니다. 그림을 다시 만들면 같이 고치세요.
const EMAIL_UV = { u: [70 / 2048, 785 / 2048], v: [962 / 2048, 1060 / 2048] }
// 이 거리(px)보다 적게 움직이고 놓으면 '끌기'가 아니라 '클릭'으로 봅니다.
const CLICK_SLOP = 6

// 카드 두께: card.glb는 가로 대비 두께가 0.56%라 종이처럼 얇습니다.
// 실제 신용카드 비율(0.76mm ÷ 53.98mm ≈ 1.4%)이 되도록 카드 가운데를 기준으로 앞뒤 방향(z)만 2.5배 늘립니다.
// (1920 화면 기준 약 2.4px → 6px. 더 얇게 하려면 scale을 줄이세요. 1이면 원래 모델 두께)
const CARD_DEPTH = { front: 0.005398, back: 0.001373, scale: 2.5 }
const CARD_MID_Z = (CARD_DEPTH.front + CARD_DEPTH.back) / 2
const thicken = (z: number) => CARD_MID_Z + (z - CARD_MID_Z) * CARD_DEPTH.scale

// card.glb의 앞·뒷면은 평평해서 좌표(x, y)와 텍스처 좌표(u, v)가 1차식으로 대응합니다(모델에서 측정).
// z는 두꺼워진 앞·뒷면 바로 바깥(구멍 막는 원판 위치)입니다.
const FRONT_UV = { ux: 0.695368, u0: 0.249875, vy: -0.750718, v0: 0.772094, z: thicken(CARD_DEPTH.front) + 0.0002 }
const BACK_UV = { ux: -0.695998, u0: 0.750691, vy: -0.755039, v0: 0.774547, z: thicken(CARD_DEPTH.back) - 0.0004 }
// 모델에 원래 뚫려 있던 동그란 고리 구멍(중심 y 0.9418, 반지름 0.0186)을 덮는 크기
const HOLE = { y: 0.9418, radius: 0.0215 }

/** 원래 구멍을 막는 작은 원판. 카드와 같은 재질·텍스처 좌표를 써서 이음매 없이 이어집니다. */
function createHolePatch(side: typeof FRONT_UV) {
  const segments = 40
  const positions = [0, HOLE.y, side.z]
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    positions.push(Math.cos(angle) * HOLE.radius, HOLE.y + Math.sin(angle) * HOLE.radius, side.z)
  }
  const uvs: number[] = []
  const normals: number[] = []
  const facing = side === FRONT_UV ? 1 : -1
  for (let i = 0; i < positions.length; i += 3) {
    uvs.push(side.ux * positions[i] + side.u0, side.vy * positions[i + 1] + side.v0)
    normals.push(0, 0, facing)
  }
  const indices: number[] = []
  for (let i = 1; i <= segments; i++) {
    if (facing === 1) indices.push(0, i, i + 1)
    else indices.push(0, i + 1, i)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

interface CardGLTF {
  nodes: Record<'card' | 'clip' | 'clamp', THREE.Mesh>
  materials: Record<'base' | 'metal', THREE.MeshStandardMaterial>
}

function Band({ anchorY, anchorLeft, lanyardWidth, maxSpeed = 50, minSpeed = 0, onReady, onLanded, onEmailClick }: BandProps) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null!)
  const fixed = useRef<RapierRigidBody>(null!)
  const j1 = useRef<LerpedBody>(null!)
  const j2 = useRef<LerpedBody>(null!)
  const j3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)

  const [vec, ang, dir] = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], [])
  const [quat, euler] = useMemo(() => [new THREE.Quaternion(), new THREE.Euler()], [])
  // 뒷면 보여주기 시계(초). 처음에는 firstBack초 뒤에 뒤집히도록 시작점을 당겨 둡니다.
  const showcase = useRef(SHOWCASE.front - SHOWCASE.firstBack)
  // 목줄 고정점 가로 위치(월드 단위): 캔버스 가운데(0)에서 anchorLeft만큼 옮긴 자리. 물리 몸체가 처음 만들어질 때 한 번만 정합니다.
  const viewportWidth = useThree(state => state.viewport.width)
  const [anchorX] = useState(() => (anchorLeft - 0.5) * viewportWidth)
  // 착지 알림(LANDING): fallen = 줄 끝까지 떨어졌는지, calm = 느리게 움직인 시간(초), done = 이미 알렸는지
  const landing = useRef({ fallen: false, calm: 0, done: false })
  const onLandedRef = useRef(onLanded)
  useEffect(() => { onLandedRef.current = onLanded }, [onLanded])
  const segmentProps: RigidBodyProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 }

  const { nodes, materials } = useGLTF(cardModel, false, false) as unknown as CardGLTF
  const [cardMap, cutout, strap] = useTexture([cardTexture, cardCutout, strapTexture])

  useMemo(() => {
    // glTF 모델의 UV 기준에 맞춤: 뒤집지 않고 sRGB 색으로 사용
    cardMap.flipY = false
    cardMap.colorSpace = THREE.SRGBColorSpace
    cardMap.anisotropy = 16
    cardMap.needsUpdate = true
    // 슬롯 모양 마스크(흰색=카드, 검은색=뚫린 부분)
    cutout.flipY = false
    cutout.colorSpace = THREE.NoColorSpace
    cutout.needsUpdate = true
    // 목줄 무늬(CHOI - SUBIN 글자)는 줄을 따라 반복됩니다. 비스듬히 봐도 글자가 뭉개지지 않게 이방성 필터를 켭니다.
    strap.colorSpace = THREE.SRGBColorSpace
    strap.wrapS = strap.wrapT = THREE.RepeatWrapping
    strap.anisotropy = 16
    strap.needsUpdate = true
  }, [cardMap, cutout, strap])

  // 디자인 색이 조명에 바래지 않도록 카드 그림은 스스로 빛나게(emissive) 하고, 코팅(clearcoat) 반사로만 광택을 줍니다.
  // alphaMap + alphaTest로 슬롯 모양 구멍을 실제로 뚫습니다.
  const cardMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 'black', emissive: 'white', emissiveMap: cardMap, emissiveIntensity: 1,
    alphaMap: cutout, alphaTest: 0.5,
    roughness: 1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.6,
  }), [cardMap, cutout])
  const holePatches = useMemo(() => [createHolePatch(FRONT_UV), createHolePatch(BACK_UV)], [])
  // 원본 모델은 그대로 두고, 복사본을 카드 가운데 기준으로 z 방향만 늘려 두께를 줍니다(클립·고리는 그대로).
  const cardGeometry = useMemo(() => {
    const geometry = nodes.card.geometry.clone()
    geometry.translate(0, 0, -CARD_MID_Z)
    geometry.scale(1, 1, CARD_DEPTH.scale)
    geometry.translate(0, 0, CARD_MID_Z)
    return geometry
  }, [nodes.card.geometry])
  useEffect(() => () => {
    cardMaterial.dispose()
    cardGeometry.dispose()
    holePatches.forEach(geometry => geometry.dispose())
  }, [cardMaterial, cardGeometry, holePatches])

  // MeshLineMaterial은 생성자 인자가 필요합니다. 값은 아래 props로 넣고, 인자는 한 번만 만듭니다.
  const [strapMaterialArgs] = useState<[{ resolution: THREE.Vector2 }]>(() => [{ resolution: new THREE.Vector2(1000, 1000) }])

  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
    c.curveType = 'chordal'
    return c
  })
  const [dragged, drag] = useState<false | THREE.Vector3>(false)
  const [hovered, hover] = useState(false)
  // 이메일 클릭: 카드 몸체(cardMesh)의 앞면 이메일 자리(EMAIL_UV)를 눌렀다가 거의 안 움직이고 놓으면 onEmailClick
  const cardMesh = useRef<THREE.Mesh>(null)
  const [overEmail, setOverEmail] = useState(false)
  const press = useRef<{ x: number; y: number; email: boolean } | null>(null)
  const onEmailClickRef = useRef(onEmailClick)
  useEffect(() => { onEmailClickRef.current = onEmailClick }, [onEmailClick])
  const hitsEmail = (event: ThreeEvent<PointerEvent>) => {
    const uv = event.uv
    if (event.object !== cardMesh.current || !uv) return false
    return uv.x >= EMAIL_UV.u[0] && uv.x <= EMAIL_UV.u[1] && uv.y >= EMAIL_UV.v[0] && uv.y <= EMAIL_UV.v[1]
  }

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]])

  useEffect(() => { onReady?.() }, [onReady])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = dragged ? 'grabbing' : overEmail ? 'pointer' : 'grab'
    return () => { document.body.style.cursor = '' }
  }, [hovered, dragged, overEmail])

  const getLerped = (body: LerpedBody) => {
    if (!body.lerped) body.lerped = new THREE.Vector3().copy(body.translation())
    return body.lerped
  }

  useFrame((state, rawDelta) => {
    // 화면 밖에서 멈췄다가 다시 돌아올 때 한 번에 튀지 않도록 시간 간격을 제한
    const delta = Math.min(rawDelta, 1 / 30)
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z })
    }
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return
    ;[j1, j2].forEach(ref => {
      const lerped = getLerped(ref.current)
      const distance = Math.max(0.1, Math.min(1, lerped.distanceTo(ref.current.translation())))
      lerped.lerp(ref.current.translation(), delta * (minSpeed + distance * (maxSpeed - minSpeed)))
    })
    curve.points[0].copy(j3.current.translation())
    curve.points[1].copy(getLerped(j2.current))
    curve.points[2].copy(getLerped(j1.current))
    curve.points[3].copy(fixed.current.translation())
    band.current.geometry.setPoints(curve.getPoints(32))
    // 착지 확인: 줄 끝까지 떨어진 뒤 속도가 LANDING.speed 아래로 LANDING.hold초 머물면 한 번 알립니다(끄는 중에는 세지 않음).
    if (!landing.current.done) {
      const position = card.current.translation()
      const velocity = card.current.linvel()
      if (anchorY - position.y > LANDING.fallen) landing.current.fallen = true
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
      // 느린 컴퓨터에서도 실제 시간으로 셉니다(한 번에 0.25초까지만).
      landing.current.calm = landing.current.fallen && !dragged && speed < LANDING.speed ? landing.current.calm + Math.min(rawDelta, 0.25) : 0
      if (landing.current.calm >= LANDING.hold) {
        landing.current.done = true
        onLandedRef.current?.()
      }
    }
    // 카드가 세로축으로 목표 각도(앞면 0 / 뒷면 180°)를 향해 부드럽게 돌도록 회전 속도를 조금씩 보탭니다.
    // (원본은 늘 앞면(0)으로만 되돌렸습니다.)
    // 시계는 실제 흐른 시간으로 셉니다(느린 컴퓨터에서도 같은 박자). 화면 밖에서 멈췄다 돌아올 때 튀지 않게 한 번에 0.25초까지만.
    // 이메일 위에 마우스를 올려 두면 누르기 전에 뒤집히지 않도록 앞면에서 기다립니다.
    if (dragged || overEmail) showcase.current = 0
    else showcase.current += Math.min(rawDelta, 0.25)
    const cycle = SHOWCASE.front + SHOWCASE.back
    const target = showcase.current % cycle < SHOWCASE.front ? 0 : Math.PI
    ang.copy(card.current.angvel())
    const r = card.current.rotation()
    euler.setFromQuaternion(quat.set(r.x, r.y, r.z, r.w), 'YXZ')
    let error = target - euler.y
    error = Math.atan2(Math.sin(error), Math.cos(error)) // -180° ~ 180° 사이로
    if (target === Math.PI && Math.abs(Math.abs(error) - Math.PI) < 0.05) error = Math.PI // 정면에서 시작할 때는 늘 같은 방향으로 돔
    card.current.setAngvel({ x: ang.x, y: ang.y + error * SHOWCASE.stiffness * Math.min(rawDelta, 0.1), z: ang.z }, true)
  })

  return (
    <>
      <group position={[anchorX, anchorY, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => { hover(false); setOverEmail(false) }}
            onPointerMove={(event: ThreeEvent<PointerEvent>) => { if (!dragged) setOverEmail(hitsEmail(event)) }}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              ;(event.target as Element).releasePointerCapture(event.pointerId)
              drag(false)
              const start = press.current
              press.current = null
              if (start?.email && Math.hypot(event.nativeEvent.clientX - start.x, event.nativeEvent.clientY - start.y) < CLICK_SLOP) {
                onEmailClickRef.current?.({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY })
              }
            }}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              ;(event.target as Element).setPointerCapture(event.pointerId)
              press.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY, email: hitsEmail(event) }
              drag(new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation())))
            }}
          >
            <mesh ref={cardMesh} geometry={cardGeometry} material={cardMaterial} />
            {holePatches.map((geometry, index) => <mesh key={index} geometry={geometry} material={cardMaterial} />)}
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial args={strapMaterialArgs} color="white" depthTest={false} useMap={1} map={strap} repeat={[-4, 1]} lineWidth={lanyardWidth} />
      </mesh>
    </>
  )
}
