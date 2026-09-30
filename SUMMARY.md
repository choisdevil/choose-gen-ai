# 구현 내용 정리

> 기준일: 2026-09-30 (첫 데이터). 이후 표의 추천은 매일 아침 예약 작업이 `data/tasks.json`을 갱신하면 바뀔 수 있습니다. 최신 값은 사이트 또는 `data/tasks.json`이 기준입니다.

## 1. 사이트 (API 없는 정적 사이트)

| 기능 | 내용 |
|---|---|
| 업무 분류 선택 | 7개 분류 카드 → 세부 업무(총 27개) 버튼 → 바로 추천 결과 |
| 키워드 검색 | "세특", "가정통신문", "루브릭" 등 입력 → 맞는 업무 목록, Enter로 바로 결과 |
| 유료/무료 전환 | "유료 구독 있음 / 무료로만" 토글. 무료 추천은 무료 요금제에서 실제로 쓸 수 있는 모델만(검증 스크립트가 강제) |
| 추천 결과 | 모델명·회사·요금제, **노력 5단계 막대(low·medium·high·xhigh·max)**, "이렇게 설정하세요"(서비스별 실제 메뉴 이름), 추천 이유, 다른 선택지, 잘 쓰는 요령, 주의 사항, 출처 |
| 확인 방식 표시 | 모델마다 "공식 페이지 확인" 또는 "검색 요약 확인" + 확인 날짜 |
| 정보 패널 | 학교 AI 활용 지침 / 오늘 기준 모델 목록 / 노력 단계 설명 / 오늘 확인한 벤치마크·후기 / 갱신 기록 |
| 공유 | 주소에 선택 상태 저장(예: `#task=exam-items&plan=free`) |
| 화면 테마 | 기본 다크, 상단에서 🌙 다크 · ☀️ 라이트 · 💻 시스템(기기 설정 따름) 선택, 선택은 브라우저에 저장 |
| 기타 | 모바일 대응, 갱신이 48시간 넘게 늦으면 상단에 경고 |

## 2. 데이터 파일

| 파일 | 내용 |
|---|---|
| `data/models.json` | 모델 18개: 요금제, 서비스별 노력 설정 방법, 확인 방식, 출처 |
| `data/tasks.json` | 업무 분류·세부 업무·키워드, 유료/무료 추천(모델+노력+이유), 대안, 요령, 주의, 학교 AI 지침 4건 |
| `data/signals.json` | 그날 확인한 벤치마크(Arena, Artificial Analysis, 수능 LLM 풀이 등)와 SNS(X·Threads·Instagram·Facebook 등 공개 게시물) 후기 요약·출처. 결과 화면에 관련 모델의 반응 표시 |
| `data/changelog.json` | 날짜별 갱신 기록(확인 불가 항목 포함) |
| `scripts/validate.mjs` | 모델 id 참조, 무료 추천의 무료 여부, 노력 값, 출처 URL, 날짜 형식 검사 |
| `.github/workflows/validate.yml` | push·PR 때 데이터 자동 검증 |

## 3. 매일 아침 자동 갱신 (Claude 클라우드 예약 작업)

| 항목 | 값 |
|---|---|
| 이름 | choose-gen-ai 일일 갱신 |
| 실행 위치 | Claude Code 클라우드 환경 `Default` (anthropic_cloud)의 **전용 세션** "choose-gen-ai 매일 아침 데이터 갱신 (예약 작업 전용)" — 저장소 연결, 지정 브랜치 `main` |
| 일정 | 매일 07:52 KST 시작 (`CRON_TZ=Asia/Seoul 52 7 * * *`) → 8시 무렵 반영 |
| 순서 | `main` 최신화 → `ROUTINE.md` 절차(모델 확인 → 벤치마크·후기 확인 → 근거 있을 때만 추천 변경 → 기록) → 검증 → `main` push |
| 안전장치 | 검증 실패 시 push 안 함 / `main`에 사이트가 없으면 아무것도 안 바꿈 / `main` push가 거부되면 날짜 브랜치로 push 후 보고 |

## 4. 업무 분류와 현재 추천

### 📚 수업 준비 — 지도안, 활동지, PPT, 읽기 자료

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 수업 지도안·차시 계획 | Claude Opus 5.5 · **high** | Claude Sonnet 5.5 · **medium** | 지도안, 교수학습과정안, 차시, 수업계획 |
| 활동지·학습지 만들기 | Claude Opus 5.5 · **medium** | Claude Sonnet 5.5 · **medium** | 활동지, 학습지, 워크시트, 빈칸 |
| 수업 PPT·슬라이드 | Claude Opus 5.5 · **medium** | Claude Sonnet 5.5 · **medium** | PPT, 피피티, 슬라이드, 프레젠테이션 |
| 읽기 자료·지문 수준 조정 | Claude Sonnet 5.5 · **medium** | Gemini Flash (무료 3.6 / 유료 3.8) · **medium** | 지문, 읽기 자료, 수준 조정, 쉬운 말 |
| 수업용 퀴즈·게임·웹 활동 만들기 | Claude Sonnet 5.5 · **high** | Claude Sonnet 5.5 · **medium** | 퀴즈, 게임, 웹앱, 인터랙티브 |

### 📝 평가 — 문항 출제·검토, 루브릭, 피드백

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 시험 문항 출제 | Claude Opus 5.5 · **xhigh** | Gemini Flash (무료 3.6 / 유료 3.8) · **high** | 문항, 출제, 시험, 지필평가 |
| 문항 오류·정답 검토 | GPT-5.6 Sol · **high** | Gemini Flash (무료 3.6 / 유료 3.8) · **high** | 검토, 오류, 정답 확인, 이의제기 |
| 채점 기준표(루브릭) | Claude Opus 5.5 · **high** | Claude Sonnet 5.5 · **medium** | 루브릭, 채점 기준, 평가 기준, 채점기준표 |
| 서술형 답안 피드백 초안 | Claude Sonnet 5.5 · **medium** | Gemini Flash (무료 3.6 / 유료 3.8) · **medium** | 피드백, 서술형, 논술, 첨삭 |
| 수행평가 과제 설계 | Claude Opus 5.5 · **high** | Claude Sonnet 5.5 · **medium** | 수행평가, 과제, 프로젝트, AI 활용 범위 |

### 🧾 생활기록부 — 세특·행특 문장 점검 (직접 작성 원칙)

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 세특·행특 문장 다듬기 (교사 초안 기반) | Claude Sonnet 5.5 · **low** | Claude Sonnet 5.5 · **low** | 세특, 생기부, 학생부, 행특 |
| 기재요령 점검 (금지 표현·분량) | Claude Opus 5.5 · **high** | NotebookLM · **medium** | 기재요령, 금지어, 기재 불가, 분량 |

### 🏫 행정·공문 — 공문, 가정통신문, 회의록, 엑셀

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 공문·기안문 작성 | Claude Sonnet 5.5 · **medium** | Claude Sonnet 5.5 · **low** | 공문, 기안, 기안문, 내부결재 |
| 가정통신문·안내문 | Claude Sonnet 5.5 · **low** | GPT-5.6 Luna · **low** | 가정통신문, 안내문, 통신문, 알림 |
| 회의록·연수 내용 정리 | Claude Sonnet 5.5 · **low** | NotebookLM · **medium** | 회의록, 협의록, 연수, 요약 |
| 엑셀·구글시트 정리·수식 | Claude Sonnet 5.5 · **medium** | Claude Sonnet 5.5 · **medium** | 엑셀, 스프레드시트, 구글시트, 수식 |
| 각종 계획서·결과 보고서 | Claude Opus 5.5 · **high** | Claude Sonnet 5.5 · **medium** | 계획서, 보고서, 운영계획, 결과보고 |

### 💬 학생·학부모 소통 — 문자, 상담 준비, 번역

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 학부모 문자·알림장 문구 | Claude Sonnet 5.5 · **low** | GPT-5.6 Luna · **low** | 학부모, 문자, 알림장, 하이클래스 |
| 상담 준비·대화 시나리오 | Claude Opus 5.5 · **medium** | Claude Sonnet 5.5 · **medium** | 상담, 학생 상담, 학부모 상담, 대화 |
| 다문화 가정 안내문 번역 | Claude Opus 5.5 · **medium** | Gemini Flash (무료 3.6 / 유료 3.8) · **low** | 번역, 다문화, 외국어, 베트남어 |

### 🔍 조사·연구·연수 — 최신 자료 조사, 긴 문서 요약, 연구

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 최신 자료·정책 조사 | Claude Opus 5.5 · **high** | Perplexity (검색·Deep Research) · **high** | 조사, 리서치, 딥리서치, 정책 |
| 긴 문서·지침·교육과정 요약 | Claude Sonnet 5.5 · **medium** | NotebookLM · **medium** | 요약, PDF, 지침, 교육과정 |
| 논문·연구 계획 (연구대회·대학원) | Claude Opus 5.5 · **xhigh** | Claude Sonnet 5.5 · **high** | 논문, 연구, 연구대회, 대학원 |

### 🎨 이미지·영상 — 삽화, 포스터, 짧은 영상

| 세부 업무 | 유료 구독 있을 때 | 무료로만 | 검색 키워드(일부) |
|---|---|---|---|
| 수업 삽화·학습 그림 | ChatGPT Images 2.5 · **low** | ChatGPT Images 2.5 · **low** | 이미지, 그림, 삽화, 일러스트 |
| 포스터·안내 이미지 (글자 포함) | ChatGPT Images 2.5 · **low** | ChatGPT Images 2.5 · **low** | 포스터, 홍보, 현수막, 배너 |
| 짧은 수업 영상 만들기 | Gemini Omni Flash (영상) · **low** | Gemini Omni Flash (YouTube Create·Shorts) · **low** | 영상, 동영상, 비디오, 쇼츠 |
| 인포그래픽·한눈에 보는 요약 자료 | NotebookLM · **medium** | NotebookLM · **medium** | 인포그래픽, 요약 자료, 도식, 마인드맵 |
