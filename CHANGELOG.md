# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-07-10

### Added

- OpenAI Codex CLI를 서브에이전트로 직접 호출하는 기능 추가.
  - `codex-worker` 에이전트 — worker와 같은 기계적인 작업을 `codex exec`(workspace-write 샌드박스)로 실행. Codex가 파일을 고치고, 에이전트는 결과를 직접 재검증(파일 재확인 + 테스트 재실행)한다.
  - `codex-reviewer` 에이전트 — reviewer와 같은 커밋 전 검토를 `codex exec review`(read-only 샌드박스)로 실행. 소스에서 확인되지 않는 지적은 걸러낸다.
  - `scripts/codex-run.js` — Codex CLI 래퍼. Windows의 `codex.cmd` 셰임까지 포함한 PATH 탐색, 역할별 샌드박스 강제, stdin 프롬프트 전달(따옴표 이스케이프 불필요), 타임아웃, 최종 메시지 추출, 흔한 실패(모델 미지원·CLI 구버전·git 저장소 아님)에 대한 조치 힌트를 담당한다.
- `/orchestrate --codex` — 기계 작업과 검토를 Codex 에이전트에게 위임.
- `/orchestrate --cross-review` — 같은 diff를 `reviewer`(Opus)와 `codex-reviewer`(Codex)로 병렬 검토하고 지적사항 합집합을 보고. 충돌 지점은 reasoner가 판정.
- `MMT_CODEX_MODEL` / `MMT_CODEX_WORKER_MODEL` / `MMT_CODEX_REVIEWER_MODEL` / `MMT_CODEX_BIN` 환경변수 지원.

### Changed

- SessionStart 훅이 PATH 스캔(프로세스 미실행)으로 Codex CLI 설치 여부를 감지해 codex-* 에이전트의 활성/비활성 상태를 표시.
- `/team-status`가 `codex-run.js --check`로 Codex 연동 상태(경로·버전·모델 설정)를 함께 보고.
- `orchestration-protocol` 스킬에 codex-* 위임 기준 추가 — 기본값은 Claude(worker/reviewer)이고, Codex는 명시적 요청·교차 검증·반복 실패 시에만 선택.

### Notes

- Codex CLI가 없으면 codex-* 에이전트는 비활성 상태로 남고 나머지 기능은 그대로 동작한다 (`npm install -g @openai/codex` + `codex login`).
- `codex-reviewer`는 Codex CLI 실행을 위해 `Bash`가 필요하므로, `reviewer`(Bash 없음)와 달리 읽기 전용 보장이 도구 허용목록이 아니라 Codex 샌드박스에서 나온다. 강한 보장이 필요하면 `reviewer`를 사용할 것.

## [1.1.1] - 2026-07-05

### Changed

- reviewer를 완전 읽기 전용으로 강화 — `tools`에서 Bash 제거하고 `disallowedTools`에 Bash 추가. 파일 시스템·셸을 통한 변형 가능성을 원천 차단. 테스트 실행이 필요한 검토 항목은 worker에게 위임하도록 지시 변경.

### Fixed

- SessionStart 훅 안내에 `reviewer`가 누락되던 문제 수정 — 팀 구성 안내에 reviewer 줄 추가 (reviewer 자체 검토로 발견).
- SessionStart 훅이 BOM(byte order mark)이 붙은 `settings.local.json`을 파싱하지 못해 설정이 있어도 "미설정"으로 표시되던 문제 수정.

## [1.1.0] - 2026-07-05

### Added

- plugin.json에 `displayName`, `homepage`, `repository` 메타데이터 추가.
- worker 에이전트에 `maxTurns` 가드 추가.
- reviewer 에이전트 추가.
- `/orchestrate --plan-only` 옵션 추가.
- `/team-status` 커맨드 추가.
- evals 및 CI 추가.

### Changed

- SessionStart 훅에 `matcher: "startup|clear"` 추가 — resume/compact 시 중복 발화 방지.
- SessionStart 훅 스크립트의 설정 파일 경로를 CWD 기준에서 `CLAUDE_PROJECT_DIR` 기준으로 변경.

## [1.0.0]

### Added

- 초기 릴리스: Opus/Fable 오케스트레이터 + reasoner/worker 서브에이전트.
- orchestration-protocol 스킬 추가.
- SessionStart 훅 추가.
