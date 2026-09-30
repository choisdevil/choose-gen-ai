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

Claude Code(웹/앱)의 예약 작업(Routine)을 만들고 다음처럼 설정합니다.

- 저장소: `choisdevil/choose-gen-ai`
- 일정: 매일 오전 8시 KST 전후 (예: `CRON_TZ=Asia/Seoul 52 7 * * *` → 7:52에 시작해 8시 무렵 반영)
- 프롬프트:
  ```
  choisdevil/choose-gen-ai 저장소의 ROUTINE.md에 적힌 "일일 갱신 절차"를 처음부터 끝까지 그대로 수행해.
  ```
- 환경의 네트워크 정책이 웹 검색/웹 페이지 접근과 GitHub push를 허용해야 합니다.

절차의 핵심은 `ROUTINE.md`에 있습니다. 공식 발표로 모델 목록을 확인하고, 벤치마크(LMArena, Artificial Analysis 등)와 공개된 사용 후기를 확인해 `signals.json`에 출처와 함께 남긴 뒤, 근거가 있을 때만 추천을 바꾸고, `node scripts/validate.mjs` 통과 후 `main`에 push합니다.

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
