---
description: 현재 오케스트레이터 기본 모델/effort 설정과 팀 구성(reasoner/worker/reviewer)을 확인해 보여줍니다
argument-hint: (인자 없음)
allowed-tools: Read
---

현재 MMT 오케스트레이션 설정 상태를 점검해서 사용자에게 보고하세요.

## 1. 오케스트레이터 기본값 읽기

프로젝트 루트의 `.claude/settings.local.json`을 읽으세요.

- 파일이 있으면 `model`과 `effortLevel` 값을 확인합니다.
  - `model`이 `opus`이면 "Opus 4.8", `fable`이면 "Fable 5"로 풀어서 표시하세요.
  - 두 필드 중 하나라도 없으면 "미설정"으로 표시하세요.
- 파일이 없거나 두 필드가 모두 없으면: 오케스트레이터 기본값이 아직 설정되지
  않았다고 안내하고, `/orchestrator-model`로 설정할 수 있다고 알려주세요.

`effortLevel`은 설정 파일에 `low`/`medium`/`high`/`xhigh`만 저장되며 `max`는
세션 한정이라는 점을 (관련될 때만) 덧붙이세요.

## 2. 팀 구성 요약

아래 고정 구성을 표로 정리해 보여주세요 (이 값들은 각 에이전트/커맨드에 하드코딩되어
있으므로 그대로 사용):

| 역할 | 모델 | effort | 용도 |
|---|---|---|---|
| 오케스트레이터 (메인 세션) | 1단계에서 읽은 값 (Opus 4.8 / Fable 5) | 1단계에서 읽은 값 | 계획·분배·종합 전담, 직접 구현 안 함 |
| reasoner | Opus | max | 근본 원인 분석, 알고리즘/아키텍처 설계, 트레이드오프 판단 |
| worker | Sonnet | medium | 보일러플레이트, 테스트, 포맷팅, 결정된 패턴 반복 적용 |
| reviewer | Opus | high | 커밋 전 diff/설계 검토 (읽기 전용, 문제만 반환) |

## 3. 사용법 요약 안내

마지막으로 다음을 짧게 안내하세요:

- `/orchestrate [작업]` — 계획→분배→종합 워크플로로 진행. `--plan-only`를 붙이면
  계획 단계까지만 하고 승인을 기다립니다.
- `/orchestrator-model [opus|fable]` — 오케스트레이터 기본 모델/effort를 저장
  (다음 세션부터 적용). 지금 세션에 바로 적용하려면 `/model opus`(또는 `fable`)를
  직접 입력해야 합니다.
- 훅 안내를 놓쳤다면 이 커맨드(`/team-status`)로 언제든 현재 설정을 다시 확인할 수
  있다는 것.
