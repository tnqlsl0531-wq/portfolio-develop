# GRAND EXHIBITION

최수빈의 공연 콘셉트 디자인 포트폴리오입니다. React + TypeScript + Vite로 만들었습니다.

## 다른 컴퓨터에서 처음 실행하기

1. Node.js 24.5 이상, VS Code, GitHub Desktop을 설치합니다.
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

`npm install`이 Noto Sans KR 패키지와 Min Sans 원본 글꼴을 함께 준비합니다. 최초 설치에는 인터넷 연결이 필요하며, 이후에는 글꼴도 프로젝트 안에서 불러옵니다. Min Sans 다운로드가 중단되면 `npm.cmd run setup:fonts`를 다시 실행하세요.

## 두 컴퓨터에서 이어서 작업하기

- 작업 시작: GitHub Desktop에서 `Fetch origin`을 누르고, 새 변경 사항이 있으면 `Pull origin`을 누릅니다.
- 패키지 설정이 바뀌었다면 `npm.cmd install`을 다시 실행합니다. 화면은 `npm.cmd run dev`로 실행합니다.
- 작업 종료: VS Code에서 파일을 저장하고, GitHub Desktop의 Summary에 변경 내용을 적은 뒤 `Commit to main → Push origin`을 누릅니다. 현재 브랜치 이름에 따라 Commit 버튼의 이름은 달라질 수 있습니다.
- 다음 컴퓨터에서는 작업 전에 다시 `Fetch origin → Pull origin`으로 최신 코드를 받습니다.

컴퓨터에 파일을 저장하는 것과 GitHub에 올리는 것은 별도입니다. 다른 컴퓨터로 옮기기 전에 Push까지 완료하세요.

`node_modules`와 `dist`는 저장소에 포함하지 않습니다. 다른 컴퓨터에서 `npm.cmd install`을 실행하면 필요한 패키지가 설치됩니다.

## 포함된 수정

- Artist Gallery: 기울어진 사진 마퀴 위에서만 움직임을 멈춥니다. 제목, 설명, 버튼, 마퀴 바깥 빈 공간에서는 계속 움직이며, 마우스가 사진 트랙을 벗어나면 멈춘 위치부터 이어집니다.
- Hero: CHOI-SUBIN / PRESENTS의 테두리가 페이지를 열 때 한 번 그려지고 그대로 남습니다. 피그마처럼 Regular 굵기, 자간 0, 외곽선 1px, 색상 `#F8574F`이며 글자별 그리기 시간은 1.9초, 채우기는 없음입니다.
- Show Line-up: 국순당은 Team / Web, 자두야는 Team / App으로 구분합니다. 처음에는 플랫폼 All로 두 프로젝트를 모두 보여주며, 드롭다운으로 나눠 볼 수 있습니다.
- Artist Gallery: 위·아래 흰색 그라데이션의 끝 불투명도를 92%에서 100%로 올렸습니다.
- 히어로: 피그마 사진 3장을 배치하고, 사진 가장자리가 뚝 끊기지 않게 부드럽게 투명해지도록 했습니다(가운데 한복 사진은 왼쪽 아래 모서리까지). 창 높이가 낮아도 사진이 히어로 아래로 잘리지 않게 크기를 제한합니다. 투명해지는 길이는 `src/App.css`의 사진별 `--fade`(아래), `--fade-left`·`--fade-right`(좌우) 값으로 조절합니다.
- 히어로 커서 효과: 사진은 채도를 90% 뺀 상태, 글자·배경은 회색으로 보이다가, 마우스를 올리면 커서 주변 원 안에서만 사진은 원래 색, GRAND·EXHIBITION 글자와 아래 배경은 코랄·와인 색(피그마 263-409), 히어로 아래 물결은 배경이 끝나는 와인색(#502421)으로 드러납니다. 원 크기·가장자리는 `src/App.css`의 `.hero__photo-color`, 따라오는 속도는 `src/App.tsx`의 `REVEAL_FOLLOW`·`REVEAL_FADE`로 조절합니다. 터치 기기에서는 처음부터 원래 색으로 보입니다.
- Director’s Note: 사진과 글이 나란히 배치되는 화면에서는 사진 중앙이 화면 중앙에 도달하면 고정되고, 마지막 소개 문단의 끝에서 함께 올라갑니다. 좁은 모바일 화면에서는 사진 다음에 글이 자연스럽게 이어집니다.
- Contact: 스태프 패스가 3D 목줄에 매달려 흔들리며, 마우스로 끌어 당길 수 있습니다(React Bits Lanyard). 폰·터치 태블릿·동작 줄이기 설정에서는 기존 그림 카드가 나옵니다.
- 화면 배율 200% PC에서도 태블릿 배치 대신 데스크톱 디자인을 비율대로 줄여 보여줍니다.
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
