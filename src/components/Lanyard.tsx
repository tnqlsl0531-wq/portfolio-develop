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
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame } from '@react-three/fiber'
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
  fov?: number
  gravity?: [number, number, number]
  lanyardWidth?: number
  onReady?: () => void
}

export default function Lanyard({
  active = true,
  cameraDistance = 11.6,
  anchorY = 4,
  fov = 20,
  gravity = [0, -40, 0],
  lanyardWidth = 1,
  onReady,
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
          <Band anchorY={anchorY} lanyardWidth={lanyardWidth} onReady={onReady} />
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

interface BandProps {
  anchorY: number
  lanyardWidth: number
  maxSpeed?: number
  minSpeed?: number
  onReady?: () => void
}

// card.glb의 앞·뒷면은 평평해서 좌표(x, y)와 텍스처 좌표(u, v)가 1차식으로 대응합니다(모델에서 측정).
const FRONT_UV = { ux: 0.695368, u0: 0.249875, vy: -0.750718, v0: 0.772094, z: 0.0056 }
const BACK_UV = { ux: -0.695998, u0: 0.750691, vy: -0.755039, v0: 0.774547, z: 0.001 }
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

function Band({ anchorY, lanyardWidth, maxSpeed = 50, minSpeed = 0, onReady }: BandProps) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null!)
  const fixed = useRef<RapierRigidBody>(null!)
  const j1 = useRef<LerpedBody>(null!)
  const j2 = useRef<LerpedBody>(null!)
  const j3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)

  const [vec, ang, rot, dir] = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], [])
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
  useEffect(() => () => {
    cardMaterial.dispose()
    holePatches.forEach(geometry => geometry.dispose())
  }, [cardMaterial, holePatches])

  // MeshLineMaterial은 생성자 인자가 필요합니다. 값은 아래 props로 넣고, 인자는 한 번만 만듭니다.
  const [strapMaterialArgs] = useState<[{ resolution: THREE.Vector2 }]>(() => [{ resolution: new THREE.Vector2(1000, 1000) }])

  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
    c.curveType = 'chordal'
    return c
  })
  const [dragged, drag] = useState<false | THREE.Vector3>(false)
  const [hovered, hover] = useState(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]])

  useEffect(() => { onReady?.() }, [onReady])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = dragged ? 'grabbing' : 'grab'
    return () => { document.body.style.cursor = '' }
  }, [hovered, dragged])

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
    ang.copy(card.current.angvel())
    rot.copy(card.current.rotation())
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true)
  })

  return (
    <>
      <group position={[0, anchorY, 0]}>
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
            onPointerOut={() => hover(false)}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              ;(event.target as Element).releasePointerCapture(event.pointerId)
              drag(false)
            }}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              ;(event.target as Element).setPointerCapture(event.pointerId)
              drag(new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation())))
            }}
          >
            <mesh geometry={nodes.card.geometry} material={cardMaterial} />
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
