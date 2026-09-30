# choose-gen-ai — 선생님 AI 고르기

교사 업무에 어떤 생성형 AI를 선택하면 좋을지 골라주는 도우미입니다.
메인 화면에서 **업무 분류 → 세부 업무**만 누르면(또는 키워드로 검색하면) 오늘 기준으로 알맞은 **모델**과 **노력(low·medium·high·xhigh·max)**, 그 서비스에서 노력을 실제로 설정하는 방법을 보여 줍니다.

- API를 쓰지 않는 **정적 사이트**입니다(HTML/CSS/JS + JSON). 서버·빌드 과정이 필요 없습니다.
- 추천 데이터는 매일 오전 8시(KST) 무렵 **Claude 예약 작업**이 웹을 확인해 `data/*.json`을 갱신하고 GitHub에 커밋합니다. 그래서 실시간 추천이 아니라 "오늘 아침 기준" 추천입니다.

## 폴더 구조

```
index.html            메인 화면
assets/style.css      디자인(라이트/다크 모드, 모바일 대응)
assets/app.js         분류 선택·키워드 검색·결과 표시
data/models.json      모델 목록 + 서비스별 노력 설정 방법 + 출처
data/tasks.json       업무 분류/세부 업무 + 추천(유료/무료) + 요령·주의
data/signals.json     그날 확인한 벤치마크·사용 후기 요약(출처 포함)
data/changelog.json   날짜별 갱신 기록
scripts/validate.mjs  데이터 검증 (모델 id 참조, 무료 추천의 무료 여부, 출처 URL 등)
ROUTINE.md            매일 8시 예약 작업이 따를 갱신 절차
.github/workflows/validate.yml  push 때 데이터 자동 검증
```

## 사이트 공개 (GitHub Pages)

1. 이 브랜치를 `main`에 병합합니다.
2. 저장소 **Settings → Pages → Build and deployment**에서 Source를 **Deploy from a branch**, Branch를 **main / (root)** 로 저장합니다.
3. 잠시 후 `https://choisdevil.github.io/choose-gen-ai/`에서 열립니다. 예약 작업이 `main`에 push하면 자동으로 다시 배포됩니다.

로컬에서 확인할 때는 `python3 -m http.server 8000` 실행 후 `http://localhost:8000`을 엽니다(`file://`로 열면 JSON을 못 읽습니다).

## 매일 오전 8시 자동 갱신 (Claude 예약 작업)

클라우드 예약 작업(Routine) **"choose-gen-ai 일일 갱신"** 이 설정되어 있습니다.

| 항목 | 값 |
|---|---|
| 실행 위치 | Claude Code 클라우드 환경 `Default` (anthropic_cloud)의 **전용 세션** "choose-gen-ai 매일 아침 데이터 갱신 (예약 작업 전용)" — 저장소 연결, 지정 브랜치 `main` |
| 일정 | `CRON_TZ=Asia/Seoul 52 7 * * *` (매일 07:52 KST 시작 → 8시 무렵 반영) |
| 할 일 | `ROUTINE.md`의 "일일 갱신 절차" 수행 → `node scripts/validate.mjs` 통과 시 `main`에 push |
| main push 거부 시 | `claude/daily-data-YYYY-MM-DD` 브랜치로 push 후 보고 |
| 사이트 미병합 시 | `main`에 `data/models.json`이 없으면 아무것도 바꾸지 않고 종료 |

예약 작업은 claude.ai의 Routines 화면에서 켜고 끄거나 일정을 바꿀 수 있습니다. 전용 세션을 보관(archive)·삭제하면 예약 작업이 동작하지 않으니 그대로 두세요. 참고: Routines 화면의 "지금 실행"(수동 실행)은 저장소가 없는 새 세션에서 돌기 때문에 push가 되지 않습니다. 매일 07:52 정기 실행은 전용 세션으로 들어가도록 설정되어 있습니다(첫 정기 실행은 2026-10-01 07:52 KST). 환경의 네트워크 정책(현재 "trusted network access")이 arena.ai, artificialanalysis.ai 등 일부 사이트를 막기 때문에, 그런 곳은 웹 검색 요약으로 확인하고 `verification: "search-summary"`로 표시합니다. 원문까지 직접 확인하게 하려면 환경 설정의 Network access에서 해당 도메인을 허용하세요.

## 데이터 직접 수정하기

`data/tasks.json`에서 업무를 추가하려면 카테고리의 `tasks` 배열에 항목을 넣습니다.

```json
{
  "id": "unique-task-id",
  "name": "세부 업무 이름",
  "keywords": ["검색", "키워드"],
  "recommend": {
    "paid": { "model": "models.json의 id", "effort": "high", "why": "추천 이유" },
    "free": { "model": "무료 사용 가능한 모델 id", "effort": "medium", "why": "추천 이유" }
  },
  "alternatives": [],
  "tips": [],
  "cautions": []
}
```

수정 후 `node scripts/validate.mjs`로 검증하세요.

## 유의사항

추천은 공개 자료를 바탕으로 한 편집 판단이며, 결과물의 사실 확인과 최종 판단은 교사에게 있습니다. 학생 개인정보는 AI에 입력하지 마시고, 학교·교육청의 생성형 AI 활용 지침을 따르세요.
