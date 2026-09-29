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
- Show Line-up 작품 선택(피그마 104-8 → 수정본 186-201): 작품 카드를 누르면 뒤 화면이 흐려지고 어두워지며, 작품 그림과 `ON STAGE`(완성된 프로젝트 보기) / `BACKSTAGE`(기획 의도와 작업 과정 보기)가 뜹니다. ON STAGE는 `src/portfolio.ts`의 프로젝트 `url`이 있으면 새 창으로 열리고, 없으면 준비 중 안내가 나옵니다. BACKSTAGE는 백스테이지 페이지가 있는 작품(국순당)은 그 페이지로 이동하고, 없는 작품은 준비 중 안내가 나옵니다. Esc·빈 곳 클릭·`돌아가기 ×`로 닫습니다. ON STAGE 버튼의 할머니·병·잔 그림은 처음엔 숨어 있다가 마우스를 버튼 위에서 실제로 움직였을 때 들어오고, 마우스가 나가면 빠집니다(카드를 누른 자리 바로 아래에 버튼이 떠도 미리 나오지 않음).
- BACKSTAGE 페이지(피그마 96-516): 국순당의 기획 의도와 작업 과정을 보여주는 어두운 페이지입니다. 주소 끝에 `#backstage-kooksoondang`이 붙어 브라우저 뒤로 가기로 돌아올 수 있고, 이 주소로 바로 들어와도 열립니다. `기획서 보러가기` 줄은 스크롤하다 화면 맨 위에 닿으면 붙어 있으며(폭 100%, 검정 반투명 50% + 흐림 12px), 주소는 `src/portfolio.ts`의 `planUrl`에 넣습니다. 마지막 동그란 단체 사진은 짙은 와인색 3D 벨벳 무대 커튼 한 벌(`src/components/Curtain3D.tsx`: 앤티크 골드 커튼 봉 + 스웨그 가림막·양옆 자보 + 아래로 살짝 퍼지는 커튼 두 폭, 정면·늘 닫힘)이 덮고 있고, 커튼 가운데에 '마우스를 올려보세요 !'(피그마 333-808, 터치 기기는 '눌러보세요 !')가 떠 있다가 처음 마우스를 올리면 흐려지며 천천히 사라집니다(페이지를 다시 열면 다시 보임). 마우스를 올리면 히어로와 같은 커서 효과로 커서 주변 원(사진 크기의 32%) 안에서만 커튼이 투명해져 뒤의 단체 사진(원래 색, 피그마 217-1474)이 보이고, 커튼 주름이 아주 살짝 찰랑거립니다. 터치 기기는 누른 자리에 원이 나타났다가 손을 떼고 1.5초 뒤 사라집니다(`useColorReveal`의 `touch` 옵션). 색·주름·찰랑거리는 세기는 `Curtain3D.tsx`의 `CURTAIN` 값으로 조절하고, WebGL이 안 되는 기기·동작 줄이기 설정에서는 같은 색의 CSS 커튼이 나옵니다(`StageCurtain.tsx`). 배경사진 1·2·3은 페이지보다 천천히 스크롤되는 패럴랙스(데스크톱 65% 속도, 폰 80%, 동작 줄이기 설정이면 꺼짐)이며 `Backstage.tsx`의 `PARALLAX` 숫자로 조절합니다. 배경사진3은 '시안에서 최종 화면이 완성되기까지'를 읽는 동안 보이지 않도록 피그마보다 아래(4380, '프로젝트를 마치며' 글 뒤)에 두고 따라오는 정도를 0.6배(`data-parallax`)로 줄였으며, 폰에서는 '프로젝트를 마치며' 글 끝자락 뒤에 놓입니다. 배경사진 가장자리는 투명하게 사라져(mask) 아래 와인색 그라데이션 위에서도 네모 테두리가 보이지 않습니다. 글·사진은 `src/components/Backstage.tsx`, 사진 파일은 `src/assets/backstage`에 있습니다. 인트로 영상 칸은 썸네일을 누르면 그 자리에서 재생되고(재생·멈춤·전체화면 버튼), 끝나면 썸네일로 돌아옵니다. 기존 인트로영상은 `kooksoondang-intro-before.mp4`(첫 장면 썸네일), 최종 인트로영상은 `kooksoondang-intro-after.mp4`(흰 작품 카드 썸네일, 피그마 296-254)입니다.
- Artist Gallery: 위·아래 흰색 그라데이션의 끝 불투명도를 92%에서 100%로 올렸습니다.
- Artist Gallery(메인, 피그마 122-625): 기울어진 4줄 마퀴에 사진 28장(1줄 9 · 2줄 7 · 3줄 7 · 4줄 5장, 폭 192 · 높이는 원본 비율)을 넣었습니다. 메인에서는 채도를 아주 낮게(22%) 깔아서 흑백은 아니지만 색이 살짝만 느껴지게 했고, 정도는 `src/App.css`의 `--gallery-saturate`로 조절합니다. 사진 목록·높이는 `src/galleryPhotos.ts`, 그림은 `src/assets/gallery`에 있고, 줄마다 사진 수가 달라도 같은 속도(1920 화면 기준 초당 약 41px)로 끊김 없이 흐릅니다.
- Artist Gallery 아카이브(피그마 109-8, 사진은 334-2): `자세히 보러가기`를 누르면 버튼 자리에서 원이 커지며 아카이브 화면이 열립니다. 윗줄 사진은 왼쪽, 아랫줄은 오른쪽으로 천천히 흐르고, 사진에 마우스를 올리면 그 줄만 멈추고 사진이 4% 커집니다. 사진을 누르면 뒤 화면이 흐려지고 어두워지며 가운데에 자르지 않은 원본 사진이 원래 색으로 크게 뜹니다(피그마 96-192, 화면 안에 들어오는 가장 큰 크기). Esc·배경 클릭·`돌아가기`로 닫습니다. 사진은 피그마 334-2에 채운 38장(윗줄 19 + 아랫줄 19, 원본 비율 크기)이며, 목록·크기는 `src/archivePhotos.ts`, 그림은 `src/assets/archive`(줄에 보이는 `top-01.webp` = 피그마와 같은 자르기, 누르면 보이는 `top-01-full.webp` = 원본 전체)에 있습니다. 줄의 사진은 평소 채도 75%로 살짝 차분하게 보이고 마우스를 올린 사진만 원래 색이 되며, 정도는 `GalleryArchive.css`의 `--archive-saturate`로 조절합니다. 흐르는 속도는 `src/components/GalleryArchive.tsx`의 `SPEED`로 조절합니다. 
- 히어로: 피그마 사진 3장을 배치하고, 사진 가장자리가 뚝 끊기지 않게 부드럽게 투명해지도록 했습니다(가운데 한복 사진은 왼쪽 아래 모서리까지). 창 높이가 낮아도 사진이 히어로 아래로 잘리지 않게 크기를 제한합니다. 투명해지는 길이는 `src/App.css`의 사진별 `--fade`(아래), `--fade-left`·`--fade-right`(좌우) 값으로 조절합니다.
- 히어로 반짝임: GRAND EXHIBITION 글자 위로 은은한 흰 반짝임 띠(흰색 40%)가 GRAND부터 3.5초에 걸쳐 지나가고, GRAND의 D에서 빛이 빠져나갈 무렵(2.1초) EXHIBITION이 바로 이어서 지나간 뒤 1.5초 쉬고 반복합니다(React Bits Shiny Text 방식). 글자 원래 색은 그대로이고, 흑백 상태와 커서 원 안의 코랄 상태 모두에서 같은 박자로 흐릅니다. 진하기는 `src/App.css`의 `--shine`, 속도·순서·쉬는 시간은 `hero-shine-grand`/`hero-shine-exhibition` 키프레임 위 설명대로 조절합니다. 히어로가 화면 밖이거나 동작 줄이기 설정이면 멈춥니다.
- 히어로 커서 효과: 사진은 채도를 90% 뺀 상태, 글자·배경은 회색으로 보이다가, 마우스를 올리면 커서 주변 원 안에서만 사진은 원래 색, GRAND·EXHIBITION 글자와 아래 배경은 코랄·와인 색(피그마 263-409), 히어로 아래 물결은 배경이 끝나는 와인색(#502421)으로 드러납니다. 원 크기·가장자리는 `src/App.css`의 `.hero__color-layer`, 따라오는 속도는 `src/hooks/useColorReveal.ts`의 `REVEAL_FOLLOW`·`REVEAL_FADE`로 조절합니다(BACKSTAGE 마지막 사진과 같이 씁니다). 터치 기기에서는 처음부터 원래 색으로 보입니다. 마우스(정밀 포인터)가 있는 기기에서는 히어로 위에서 마우스 화살표를 숨기고 커서 효과 원만 보입니다(`App.css`의 `.hero-stage { cursor: none }`).
- Director’s Note: 사진과 글이 나란히 배치되는 화면에서는 사진 중앙이 화면 중앙에 도달하면 고정되고, 마지막 소개 문단의 끝에서 함께 올라갑니다. 좁은 모바일 화면에서는 사진 다음에 글이 자연스럽게 이어집니다.
- Contact: 스태프 패스가 3D 목줄에 매달려 흔들리며, 마우스로 끌어 당길 수 있습니다(React Bits Lanyard). 폰·터치 태블릿·동작 줄이기 설정에서는 기존 그림 카드가 나옵니다. 목걸이는 Contact 섹션이 화면에 50% 이상 보였을 때(또는 화면의 절반 이상을 채웠을 때) 처음 내려오고, 가만히 있으면 내려온 지 1.8초 뒤 한 번, 그다음부터는 앞면 6초 → 뒷면 3.5초씩 천천히 돌아 뒷면도 보여줍니다(`Lanyard.tsx`의 `SHOWCASE`로 조절). 문의 폼(피그마 337-877): 입력칸 배경은 연한 코랄 34%, 종이클립은 코랄(#F8574F)입니다. `문의 보내기` 버튼은 평소 검정이고, 필수(*) 칸(이름·이메일·문의 유형·메시지)을 모두 올바르게 채우면 코랄로 바뀝니다(`소속`은 선택이라 비워도 됨, `App.css`의 `.contact-form[data-complete='true']`).
- 맨 아래 글자 띠(피그마 342-180): 코랄 바탕에 'GRAND EXHIBITION · CHOISUBIN DESIGN PORTFOLIO'가 끝없이 흐릅니다(React Bits Curved Loop, speed 2.2, curveAmount 0 = 곧은 줄, `src/components/CurvedLoop.tsx`). 마우스로 끌면 따라 움직이고 끈 방향으로 계속 흐르며, 한 벌이 끝나면 ' · '로 이어집니다. 글자 색은 피그마처럼 왼쪽 #999 → 오른쪽 #333 그라데이션, 폰에서는 2배 크기로 보여줍니다. 화면 밖·동작 줄이기 설정이면 멈춥니다.
- 화면 배율 200% PC에서도 태블릿 배치 대신 데스크톱 디자인을 비율대로 줄여 보여줍니다.
- 동작 줄이기 설정과 화면 밖 애니메이션 정지를 지원합니다.

## 내용을 바꿀 파일

| 파일 | 용도 |
| --- | --- |
| `src/portfolio.ts` | 사진, 소개, 이력, 프로젝트 정보 |
| `src/App.tsx` | 페이지 구조와 버튼 동작 |
| `src/App.css` | 섹션 배치, 반응형 스타일, 갤러리 마퀴 |
| `src/components/StrokePresenter.tsx` | 히어로 테두리 애니메이션 |
| `src/components/GalleryArchive.tsx` | Artist Gallery 아카이브 화면·사진 크게 보기 |
| `src/components/Backstage.tsx` | 작품별 BACKSTAGE 페이지(기획 의도와 작업 과정) |
| `src/hooks/useColorReveal.ts` | 커서 주변 원 안에서만 색이 보이는 효과(히어로·BACKSTAGE 공용) |
| `src/components/ProjectCover.tsx` | 작품 선택 화면·BACKSTAGE 맨 위의 흰 작품 카드 |
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
