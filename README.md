# GRAND EXHIBITION

최수빈의 공연 콘셉트 디자인 포트폴리오입니다. React + TypeScript + Vite로 만들었습니다.

## 다른 컴퓨터에서 처음 실행하기

1. Node.js 24, VS Code, GitHub Desktop을 설치합니다.
2. GitHub Desktop에서 이 저장소에 접근할 수 있는 GitHub 계정으로 로그인합니다.
3. `File → Clone repository → URL`에서 `https://github.com/tnqlsl0531-wq/portfolio`를 입력하고 `Clone`을 누릅니다.
4. 내려받은 `portfolio` 폴더를 VS Code에서 엽니다. `package.json`과 `src`가 함께 보이는 폴더가 맞습니다.
5. VS Code의 `터미널 → 새 터미널`에서 아래 명령을 한 줄씩 실행합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

터미널에서 `Local` 옆 주소를 Ctrl 키를 누른 채 클릭하면 미리보기가 열립니다. 미리보기를 보는 동안 터미널을 켜두세요. 종료하려면 `Ctrl + C`를 누릅니다.

macOS와 Linux에서는 `npm.cmd` 대신 `npm`을 사용합니다.

## 두 컴퓨터에서 이어서 작업하기

- 작업 시작: GitHub Desktop에서 `Fetch origin`을 누르고, 새 변경 사항이 있으면 `Pull origin`을 누릅니다.
- 패키지 설정이 바뀌었다면 `npm.cmd install`을 다시 실행합니다. 화면은 `npm.cmd run dev`로 실행합니다.
- 작업 종료: VS Code에서 파일을 저장하고, GitHub Desktop의 Summary에 변경 내용을 적은 뒤 `Commit to main → Push origin`을 누릅니다. 현재 브랜치 이름에 따라 Commit 버튼의 이름은 달라질 수 있습니다.
- 다음 컴퓨터에서는 작업 전에 다시 `Fetch origin → Pull origin`으로 최신 코드를 받습니다.

컴퓨터에 파일을 저장하는 것과 GitHub에 올리는 것은 별도입니다. 다른 컴퓨터로 옮기기 전에 Push까지 완료하세요.

`node_modules`와 `dist`는 저장소에 포함하지 않습니다. 다른 컴퓨터에서 `npm.cmd install`을 실행하면 필요한 패키지가 설치됩니다.

## 포함된 수정

- Artist Gallery: 기울어진 사진 마퀴 위에서만 움직임을 멈춥니다. 제목, 설명, 버튼, 마퀴 바깥 빈 공간에서는 계속 움직이며, 마우스가 사진 트랙을 벗어나면 멈춘 위치부터 이어집니다.
- Hero: CHOI-SUBIN / PRESENTS의 테두리가 반복해서 그려집니다. 색상은 `#F8574F`, 글자별 그리기 시간은 1.9초, 채우기는 없음입니다.
- 동작 줄이기 설정과 화면 밖 애니메이션 정지를 지원합니다.

## 내용을 바꿀 파일

| 파일 | 용도 |
| --- | --- |
| `src/portfolio.ts` | 사진, 소개, 이력, 프로젝트 정보 |
| `src/App.tsx` | 페이지 구조와 버튼 동작 |
| `src/App.css` | 섹션 배치, 반응형 스타일, 갤러리 마퀴 |
| `src/components/StrokePresenter.tsx` | 히어로 테두리 애니메이션 |
| `src/index.css` | 공통 스타일과 글꼴 |

프로젝트 상세 링크와 일부 사진·소개는 준비 중인 자리입니다. 문의 폼은 기본 메일 앱을 열며, 메일 앱에서 직접 보내야 전송됩니다. 자동 발송 서버는 연결하지 않았습니다.

## 확인 명령

```powershell
npm.cmd run build
npm.cmd run lint
```

빌드는 TypeScript 검사 후 배포용 파일을 `dist`에 만듭니다. `lint`는 Oxlint로 코드를 확인합니다. GitHub에 코드를 올리는 것만으로 웹사이트가 배포되지는 않습니다.

## 출처

디자인·글꼴·애니메이션 출처는 `SOURCES.txt`를, 각 라이선스는 `src/assets/fonts`와 `src/licenses`를 확인하세요.
