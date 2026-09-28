import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// .glb(3D 모델) 파일을 import해서 쓸 수 있도록 에셋으로 등록합니다.
// Contact의 3D 목줄(three.js·물리엔진)은 따로 나뉘어 필요할 때만 불러오므로 큰 파일 경고 기준을 올립니다.
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  build: { chunkSizeWarningLimit: 3500 },
})
