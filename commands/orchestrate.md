---
description: 오케스트레이터 모드로 작업을 계획-분배-종합 워크플로에 따라 진행합니다 (--plan-only로 계획까지만, --codex로 Codex 위임)
argument-hint: [작업 설명] [--plan-only] [--codex] [--cross-review]
---

다음 작업을 오케스트레이션 워크플로로 진행하세요: $ARGUMENTS

`orchestration-protocol` 스킬의 규칙을 따라 진행합니다:

1. **계획**: 작업을 구체적인 하위 작업 목록으로 분해하고, 각각을
   `[reasoner]` / `[worker]` / `[reviewer]` 태그로 분류해서 사용자에게
   짧게 보여주세요. (구현이 끝난 중요한 diff/설계를 커밋 전에 점검할
   단계가 있으면 `[reviewer]`로 표시. 사용자가 Codex를 요청했거나 교차
   검증이 필요하면 `[codex-worker]` / `[codex-reviewer]`로 표시)
2. **분배**: 독립적인 하위 작업은 병렬로, 의존적인 작업은 순차로
   Agent 도구를 통해 reasoner / worker / reviewer(필요 시 codex-worker /
   codex-reviewer)에게 위임하세요.
   오케스트레이터 본인은 직접 구현하지 않습니다. reviewer가 반환한
   지적사항은 reasoner/worker에게 다시 라우팅해 고치게 하세요.
3. **종합**: 모든 결과를 모아 하나의 일관된 답으로 정리해서 보고하세요.
   각 서브에이전트가 무엇을 했는지 1~2줄로 요약하고, 다음 단계가 있다면
   제시하세요.

## 플래그

아래 플래그들은 태그가 아니라 플래그이므로 **작업 설명에서 제외하고** 해석하세요.

### `--plan-only`

`$ARGUMENTS`에 `--plan-only`가 포함되어 있으면 **1단계(계획)까지만** 수행하고
거기서 멈추세요. 하위 작업 분해와 `[reasoner]`/`[worker]`/`[reviewer]` 태그
분류를 보여준 뒤, 위임하지 말고 사용자 승인을 기다리세요. 승인받으면 이어서
2·3단계(분배→종합)를 진행합니다.

### `--codex`

기계적인 하위 작업을 `worker`(Claude Sonnet) 대신 `codex-worker`(OpenAI Codex
CLI)에게, 검토 단계를 `reviewer` 대신 `codex-reviewer`에게 위임하세요. 추론이
필요한 작업은 이 플래그와 무관하게 계속 `reasoner`가 맡습니다.

### `--cross-review`

검토 단계에서 `reviewer`(Opus)와 `codex-reviewer`(Codex)를 **병렬로** 함께
실행하고, 두 리뷰의 지적사항을 합쳐서 보고하세요. 두 리뷰가 충돌하는 지점은
임의로 한쪽을 채택하지 말고 `reasoner`에게 판정시키세요.

Codex CLI가 설치돼 있지 않으면 codex-* 에이전트가 즉시 실패를 되돌려보냅니다.
그때는 사용자에게 알리고 worker/reviewer로 폴백하세요. 설치 여부는
`/team-status`로 미리 확인할 수 있습니다.
