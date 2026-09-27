import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'

// 버전과 체크섬을 고정한 원본입니다. 내려받은 뒤에는 로컬 파일로 빌드합니다.
const source = 'https://cdn.jsdelivr.net/gh/poposnail61/min-sans@b8ad5007a55575d030f6b57c2a0d038f295e323b/web/fonts/variable/MinSansVF.woff2'
const expectedSha256 = '0218401d2d9b651c30d217501d4389f7f5003ef92f91b55b6c1555595cf1f00a'
const directory = new URL('../src/assets/fonts/', import.meta.url)
const destination = new URL('MinSansVF.woff2', directory)
const temporary = new URL('MinSansVF.woff2.download', directory)
const checksum = data => createHash('sha256').update(data).digest('hex')

async function installFont() {
  try {
    const current = await readFile(destination)
    if (checksum(current) === expectedSha256) return
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const response = await fetch(source, { signal: AbortSignal.timeout(45_000) })
  if (!response.ok) throw new Error(`글꼴 다운로드 실패: HTTP ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (checksum(bytes) !== expectedSha256) throw new Error('글꼴 파일 검증에 실패했습니다.')
  await mkdir(directory, { recursive: true })
  await writeFile(temporary, bytes)
  await rename(temporary, destination)
  console.log('Min Sans 원본 글꼴 준비 완료')
}

try {
  await installFont()
} catch (error) {
  console.error(error.message)
  console.error('인터넷 연결을 확인하고 npm run setup:fonts를 다시 실행해주세요.')
  process.exitCode = 1
}
