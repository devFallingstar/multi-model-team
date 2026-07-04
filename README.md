# model-team

작업 성격에 따라 다른 모델이 서브에이전트로 나눠 맡는 Claude Code 플러그인.

| 역할 | 모델 | 담당 |
|---|---|---|
| 오케스트레이터 (메인 세션) | **Opus 4.8 또는 Fable 5** 중 선택 (`/orchestrator-model`) | 계획, 작업 분배, 결과 종합만 함 |
| `deep-reasoner` 서브에이전트 | Opus 고정 (`model: opus`, `effort: max`) | 어려운 디버깅, 알고리즘/아키텍처 설계 |
| `fast-worker` 서브에이전트 | Sonnet 고정 (`model: sonnet`, `effort: medium`) | 보일러플레이트, 테스트, 포맷팅, 단순 수정 |
| Codex (별도 플러그인) | 사용자의 Codex 설정 | 다른 관점의 교차 검증/리뷰 동료 |

## 오케스트레이터 모델 선택: Opus vs Fable 5

```
/orchestrator-model
```

인자 없이 실행하면 두 모델의 차이(비용, thinking, 적합한 상황)를 보여주고
선택하게 합니다. 바로 지정하려면:

```
/orchestrator-model opus     # 상시 사용에 적합, 비용/사용량 기준선
/orchestrator-model fable    # 초장기·모호한 자율 작업 전용, 비용/사용량 약 2배
```

선택하면 프로젝트의 `.claude/settings.local.json`에 `model`/`effortLevel`
기본값이 저장되어 **다음 세션부터** 자동 적용됩니다. **지금 세션**에 바로
적용하려면 안내에 따라 `/model opus` 또는 `/model fable`을 직접 입력하세요
(플러그인이 실행 중인 세션의 모델을 대신 전환할 수는 없습니다 — Claude Code
아키텍처상 메인 세션 모델 전환은 사용자가 `/model` 커맨드로 직접 해야 합니다).
세션 시작 시 훅이 현재 저장된 오케스트레이터 설정을 읽어 보여줍니다.

## 왜 오케스트레이터 모델은 플러그인이 완전히 대신할 수 없나

Claude Code 플러그인은 서브에이전트 frontmatter의 `model` 필드로 **서브에이전트의**
모델은 고정할 수 있지만, 메인 세션(오케스트레이터) 자체의 모델 전환은 `/model`
커맨드를 통해서만 가능합니다. 그래서 이 플러그인은:

- `/orchestrator-model`로 선택 → 프로젝트 설정 파일에 기본값 저장 (다음 세션부터 자동)
- 세션 시작 훅으로 현재 저장된 값을 보여주고, 지금 세션에 즉시 적용하려면
  어떤 명령을 치면 되는지 안내
- `orchestration-protocol` 스킬로 오케스트레이터가 (Opus든 Fable5든) 직접
  구현하지 않고 위임/종합만 하도록 행동 규칙을 강제

## 설치

로컬 디렉토리에서 바로 설치:

```bash
cd model-team
claude
```

Claude Code 안에서 (경로는 반드시 `./` 형식 — 점 하나 `.` 는 "Invalid marketplace
source format" 에러가 납니다):

```
/plugin marketplace add ./
/plugin install model-team@model-team-marketplace
/reload-plugins
```

터미널에서 비대화형으로 설치할 수도 있습니다:

```bash
claude plugin marketplace add ./
claude plugin install model-team@model-team-marketplace
```

GitHub 저장소로 배포하는 경우:

```
/plugin marketplace add <your-org>/model-team
/plugin install model-team@model-team-marketplace
```

## Codex 동료 추가 (선택)

다른 관점의 교차 검증을 위해 OpenAI의 공식 Codex 플러그인을 함께 설치하세요:

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Node.js 18.18+ 와 ChatGPT 계정(Free 포함) 또는 OpenAI API 키가 필요합니다.
설치 후 `orchestration-protocol` 스킬이 중요한 설계 결정/diff에 대해
`/codex:review` 또는 `/codex:adversarial-review` 실행을 제안하도록 되어 있습니다.
Codex 명령은 별도 사용량을 소모하므로 오케스트레이터가 임의로 실행하지 않고
사용자 확인을 받습니다.

## 사용법

일반 대화에서 자연어로 위임을 요청해도 됩니다:

```
deep-reasoner에게 이 레이스 컨디션 원인을 분석하게 해줘
fast-worker한테 이 함수들에 대한 테스트 스켈레톤 만들어달라고 해
```

큰 작업은 오케스트레이션 워크플로를 명시적으로 시작:

```
/orchestrate 인벤토리 시스템에 아이템 스택 병합 로직을 추가하고 테스트까지 작성해줘
```

내부적으로:
1. 오케스트레이터가 작업을 `[deep-reasoner]` / `[fast-worker]` 하위 작업으로 분해
2. 독립 작업은 병렬, 의존 작업은 순차로 위임 (직접 구현하지 않음)
3. 중요한 결정이 있으면 Codex 교차 검증을 제안
4. 결과를 하나로 종합해서 보고

## 구성 요소

```
model-team/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── agents/
│   ├── deep-reasoner.md     # model: opus, effort: max
│   └── fast-worker.md       # model: sonnet, effort: medium
├── skills/
│   └── orchestration-protocol/SKILL.md   # 역할 분리 규칙, 자동 트리거
├── commands/
│   ├── orchestrate.md        # /orchestrate 슬래시 커맨드
│   └── orchestrator-model.md # /orchestrator-model 로 Opus/Fable5 선택
├── hooks/
│   ├── hooks.json           # SessionStart 안내
│   └── session-start-reminder.js   # Node 스크립트 (bash/python3 의존성 없음, 크로스플랫폼)
└── README.md
```

## 커스터마이징 팁

- `fast-worker`의 `effort`를 `low`로 낮추면 더 저렴/빠르게 잡일을 처리합니다.
  (문서 기준: `low`/`medium`/`high`/`xhigh`/`max` 중 선택, 모델별로 지원 범위가 다름)
- `deep-reasoner`에 `isolation: worktree`를 추가하면 별도 git worktree에서
  안전하게 실험하게 할 수 있습니다.
- 두 agent 모두 `tools`를 좁혀서 (예: 리뷰 전용 agent는 `Read, Grep, Glob`만)
  권한을 최소화할 수 있습니다.
