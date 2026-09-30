# 매일 오전 8시 갱신 루틴 (Claude 예약 작업용 프롬프트)

이 파일은 Claude Code의 **예약 작업(Routine / schedule)** 이 매일 실행할 지시문입니다.
예약 작업의 프롬프트에는 아래 한 줄만 넣으면 됩니다.

```
choisdevil/choose-gen-ai 저장소의 ROUTINE.md에 적힌 "일일 갱신 절차"를 처음부터 끝까지 그대로 수행해.
```

---

## 일일 갱신 절차

너는 교사용 생성형 AI 추천 사이트(`choisdevil/choose-gen-ai`)의 데이터를 갱신하는 검증된 분석가다.
API는 쓰지 않는다. 웹 검색·웹 페이지 확인으로 **오늘 확인한 사실만** 반영하고, 확인하지 못한 내용은 절대 지어내지 않는다.

### 0. 준비

1. 이 절차는 저장소가 연결되고 지정 브랜치가 `main`인 전용 클라우드 세션에서 실행된다. 저장소 폴더가 없으면(컨테이너 재시작) `git clone https://github.com/choisdevil/choose-gen-ai.git` 후 그 폴더로 이동한다. 저장소가 연결되지 않은 세션이라 push 권한이 없으면 아무것도 바꾸지 말고 그 사실을 보고한다.
2. 기본 브랜치(`main`)를 체크아웃하고 `git pull origin main`으로 최신화한다.
3. `data/models.json`, `data/tasks.json`, `data/signals.json`, `data/changelog.json`을 읽는다. 파일이 없으면 아무것도 바꾸지 말고 "사이트가 아직 main에 병합되지 않았음"이라고 보고한 뒤 종료한다.
4. 오늘 날짜(KST, `YYYY-MM-DD`)를 `TODAY`로 둔다.

### 1. 모델 목록 최신화 (`data/models.json`)

아래 **공식 출처**를 우선 확인한다. 공식 출처에서 확인되지 않은 모델은 추가하지 않는다.

| 회사 | 확인할 곳(예) |
|---|---|
| OpenAI | openai.com/news, help.openai.com의 ChatGPT 릴리스 노트·모델 안내 |
| Google | blog.google (Gemini), gemini.google/release-notes, support.google.com/gemini |
| Anthropic | anthropic.com/news, support.claude.com 릴리스 노트, docs.claude.com 모델 개요 |
| xAI / Microsoft / Perplexity / DeepSeek 등 | 각 사 공식 블로그·도움말 |
| 국내(네이버·LG·업스테이지·카카오 등) | 각 사 공식 보도자료·서비스 공지 |

- 새 모델이 소비자용 앱(웹/모바일/데스크톱)에서 선택 가능해졌으면 항목을 추가한다. **일반 채팅 창이 아니라 앱 안의 다른 모드(예: ChatGPT Work, Codex, Gemini의 Deep Think, Claude의 Research)에서만 제공되는 모델도 포함**하고, `name`·`product`·`summary`·`effortGuide`에 어디서 고르는지 적는다. API 전용 모델만 제외한다.
- 각 회사의 **최신 발표 모델이 모두 목록에 있는지** 마지막에 한 번 더 대조한다(예: OpenAI GPT-6 Astra·6.1 Sol·Sol·Luna, Anthropic Opus·Sonnet·Fable, Google Pro·Flash).
- 앱에서 내려간 모델은 삭제하고, 그 모델을 쓰던 추천을 3단계에서 다시 정한다.
- 각 모델의 `effortGuide`(low·medium·high·xhigh·max를 그 서비스 메뉴에서 어떻게 고르는지)는 공식 도움말 기준으로 맞춘다. 서비스에 해당 단계가 없으면 "가장 가까운 옵션 + 없다는 사실"을 적는다.
- `access.free`는 **무료 요금제에서 실제로 선택 가능할 때만** `true`.
- 확인한 모델마다 `lastVerified`를 `TODAY`로, `sources`에 확인한 URL을 넣는다.
- `verification`은 공식 페이지를 직접 열어 확인했으면 `"official"`, 원문을 열지 못하고 검색 결과 요약으로만 확인했으면 `"search-summary"`로 정직하게 적는다.

### 2. 벤치마크·사용 후기 확인 (`data/signals.json`)

1. 벤치마크: LMArena(Text·Vision·Text-to-Image·Video 등), Artificial Analysis(Intelligence Index 등), 공식 모델 카드. 오늘 실제로 열어 본 페이지만 `benchmarks`에 넣고, `summary`에는 **페이지에서 읽은 순위·수치만** 적는다(순위는 날마다 바뀌므로 확인 날짜 필수).
2. **SNS·커뮤니티 후기** — 아래 플랫폼의 **공개 계정·공개 게시물**을 최근 7일 위주로 확인한다.

   | 플랫폼 | 검색 방법(예) |
   |---|---|
   | X | `site:x.com "Opus 5.5" teacher`, `site:x.com GPT-6 수업` |
   | Threads | `site:threads.com 클로드 선생님 후기`, `site:threads.com 제미나이 수업` |
   | Instagram | `site:instagram.com 교사 AI 추천`, `site:instagram.com 선생님 챗GPT` |
   | Facebook | `site:facebook.com 교사 생성형 AI 후기` (공개 그룹·공개 페이지만) |
   | 기타 | Reddit(r/Teachers, r/ClaudeAI, r/ChatGPT, r/GeminiAI), 공개 교사 블로그, GeekNews |

   - 검색어는 **모델명(오늘 models.json에 있는 이름) + 후기/사용기/비교**와 **교사·선생님·수업·생기부·teacher·lesson** 같은 교육 키워드를 섞어 한국어·영어로 각각 찾는다.
   - **공개 게시물만** 쓴다. 비공개 계정, 비공개 그룹, 친구 공개 글, DM은 쓰지 않는다. 로그인 없이 본문을 볼 수 없으면(Instagram·Facebook에서 흔함) 검색 결과 요약에 본문 내용이 드러난 경우에만 `evidence: "검색 요약"`으로 쓰고, 제목만 보이면 반영하지 않는다.
   - 광고·협찬·제휴 글, 회사 공식 계정의 홍보 글은 후기로 쓰지 않는다(공식 발표는 1단계 출처로 다룬다).
   - 개인정보를 옮기지 않는다: `summary`에는 계정 이름·실명·얼굴·소속을 적지 않고 내용만 요약한다. 출처는 `url`로만 남긴다.
   - 인용문을 지어내지 않는다. 게시물에 있는 수치·결론만 요약하고 "개인 테스트", "코딩 과제 기준"처럼 조건을 함께 적는다.
   - 각 항목 형식: `{ "platform": "X|Threads|Instagram|Facebook|Reddit|YouTube|블로그|커뮤니티|뉴스|기타", "source": "…", "url": "…", "checkedAt": TODAY, "evidence": "원문 확인|검색 요약", "relatedModels": ["models.json id", …], "summary": "…" }`
   - `relatedModels`에 넣은 모델의 추천 결과 화면에 이 후기가 "SNS·커뮤니티 반응"으로 표시된다.
   - 교사 업무를 직접 다룬 후기를 못 찾았으면 `note`에 그 사실을 적는다.
3. 각 항목에 `url`, `checkedAt: TODAY`, `summary`를 넣는다. 7일이 지난 SNS 항목과 오늘 다시 확인하지 못한 벤치마크 항목은 지운다(과거 값을 오늘 확인한 것처럼 남기지 않는다).
4. `note`에 이번 수집의 확인 방식(원문 직접 확인/검색 요약)과 한계를 한두 문장으로 적는다.
5. `updatedAt`을 현재 시각(`+09:00`)으로 바꾼다.

### 3. 추천 재평가 (`data/tasks.json`)

각 세부 업무의 `recommend.paid`, `recommend.free`, `alternatives`를 다음 기준으로 점검한다.

- **업무 성격 → 필요한 능력**: 긴 글 작성·교정(글쓰기·한국어 품질), 평가 문항·채점 기준(추론·정확성), 자료 요약(긴 문서·파일 처리), 이미지/영상(해당 생성 모델), 코딩·데이터(코딩 벤치마크), 최신 정보 조사(검색·딥리서치 기능).
- **노력(effort) 기준**: 짧은 문구·단순 변환 = low / 일반 문서 초안 = medium / 평가·분석·긴 문서 = high / 여러 단계 설계·정확성이 중요한 채점 기준 = xhigh / 한 번에 복잡한 결과물을 만들어야 하고 시간이 충분할 때만 max.
- `recommend.free`의 모델은 반드시 `access.free: true`여야 한다.
- 근거(공식 기능, 벤치마크, 반복되는 후기)가 있을 때만 추천을 바꾼다. 바꾸면 `why`를 새 근거에 맞게 고치고, 변경 사실을 changelog에 적는다.
- **SNS 후기의 반영 기준**: 후기만으로 기본 추천을 바꾸려면 서로 다른 계정의 게시물 3건 이상, 2개 이상 플랫폼에서 같은 경향이 확인되어야 한다. 그보다 약하면 추천은 그대로 두고 `tips`·`cautions`·`alternatives`의 `why`에만 반영한다(예: "사용 한도가 빨리 준다는 후기가 많음"). 벤치마크·공식 정보와 충돌하면 공식 정보·벤치마크를 우선한다.
- 업무 분류·키워드는 교사들이 실제로 검색할 만한 말을 추가해도 좋다. 학생 개인정보 관련 `cautions`는 지우지 않는다.
- `guidelines`(교육부·교육청 지침)는 새 지침이 공식 발표된 경우에만 추가·수정한다.
- `updatedAt`은 `models.json`과 같은 값으로 맞춘다.

### 4. 갱신 기록 (`data/changelog.json`)

- 맨 앞에 `{ "date": TODAY, "summary": "...", "changes": [...] }`를 추가한다. 바뀐 것이 없으면 `"summary": "변경 없음 — 모델·추천 유지 (N개 출처 확인)"`로 적는다.
- 항목은 최근 60개만 남긴다.

### 5. 검증과 반영

1. `node scripts/validate.mjs`를 실행한다. 오류가 나면 고치고 다시 실행한다. 통과하지 못하면 커밋하지 않고 오류 내용을 보고한 뒤 종료한다.
2. 커밋 메시지: `data: TODAY 일일 갱신` (본문에 주요 변경 요약).
3. `git push origin main` (네트워크 오류 시 2·4·8·16초 간격으로 최대 4번 재시도).
4. 마지막에 변경 요약(추가/삭제 모델, 바뀐 추천, 확인한 출처 수)을 짧게 보고한다.

### 사실성 규칙 (반드시 지킬 것)

- 오늘 직접 열어 본 출처에서 확인한 사실만 넣는다. 기억에 의존해 모델 이름·날짜·요금제·순위를 적지 않는다.
- 출처가 서로 다르면 공식 출처를 따르고, 공식 출처가 없으면 반영하지 않는다.
- 추천 이유(`why`)는 "~라서 추천"처럼 근거를 드러내되, 벤치마크 수치를 쓸 때는 signals.json에 같은 날짜로 기록된 값만 쓴다.
- 확인이 불가능했던 부분은 changelog `changes`에 "확인 불가: ..."로 남긴다.
