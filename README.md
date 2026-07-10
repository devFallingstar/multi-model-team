![Multi Model Team — Right model for the right job](assets/banner.png)

# Multi Model Team (MMT)

<sub>plugin id: `multi-model-team`</sub>

**Read this in other languages: [English](README.md) · [한국어](README.ko.md)**

> A Claude Code plugin that splits work across a **team of models** — a high-level
> orchestrator plans and delegates, an Opus specialist does the hard reasoning,
> a Sonnet worker handles the mechanical work, and an Opus reviewer checks the result
> before commit. Right model for the right job.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-5A67D8)

---

## What is MMT?

**MMT (Multi Model Team)** is a Claude Code plugin that turns one session into a team
of models: an orchestrator plans and delegates, an Opus agent handles hard reasoning,
a Sonnet agent handles mechanical work, and an Opus reviewer checks finished work
before commit.

It exists because a single model doing everything overpays somewhere: a top-tier model
wastes expensive tokens on boilerplate, or a cheap model makes architecture decisions
it can't handle. **MMT gives each kind of work to the model that fits it.**

| Benefit | How MMT delivers it |
|---|---|
| 💸 **Lower cost, same quality** | Sonnet (`worker`) handles boilerplate, tests, and formatting. Opus at `max` effort (`reasoner`) handles only the genuinely hard reasoning. |
| 🧠 **Better decisions on hard problems** | Debugging, algorithm design, and architecture decisions always go to a dedicated max-effort Opus agent. |
| 🎛️ **The orchestrator stays high-level** | The main session only **plans, delegates, and combines results**, so its context stays clean. |
| ⚡ **Parallel throughput** | Independent subtasks run at the same time (e.g. `reasoner` designs an algorithm while `worker` scaffolds the tests). |
| 👀 **Transparent by default** | Every session starts by printing the current team setup, so you always know which model does what. |

---

## Roles and models

| Role | Model | Responsibility |
|---|---|---|
| **Orchestrator** (main session) | **Opus 4.8** or **Fable 5** — you choose (`/orchestrator-model`) | Planning, delegation, and synthesis **only**. Does not implement. |
| `reasoner` subagent | Opus, fixed (`model: opus`, `effort: max`) | Hard debugging, algorithm & architecture design, "why does this happen" questions. |
| `worker` subagent | Sonnet, fixed (`model: sonnet`, `effort: medium`) | Boilerplate, tests, formatting/lint, repetitive edits, simple well-specified fixes. |
| `reviewer` subagent | Opus, fixed (`model: opus`, `effort: high`), read-only | Reviews a finished diff before commit — correctness, edge cases, security. Returns problems only; the orchestrator routes the fixes back to reasoner/worker. |
| `codex-worker` subagent | **OpenAI Codex CLI** (`workspace-write` sandbox) | The same mechanical work as `worker`, executed by a different model family. Opt-in. |
| `codex-reviewer` subagent | **OpenAI Codex CLI** (`read-only` sandbox) | The same pre-commit review as `reviewer`, executed by a different model family. Opt-in — useful for cross-model review. |

The `orchestration-protocol` skill enforces these roles. It triggers automatically on
coding, design, and debugging requests, making the orchestrator delegate instead of
doing the work itself.

---

## Quick start

### Install from GitHub

Inside Claude Code:

```
/plugin marketplace add devFallingstar/multi-model-team
/plugin install multi-model-team@multi-model-team-marketplace
/reload-plugins
```

### Install from a local clone

```bash
git clone https://github.com/devFallingstar/multi-model-team.git
cd multi-model-team
claude
```

Inside Claude Code — **the path must use the `./` form**; a bare `.` fails with
`Invalid marketplace source format`:

```
/plugin marketplace add ./
/plugin install multi-model-team@multi-model-team-marketplace
/reload-plugins
```

Or non-interactively from your terminal:

```bash
claude plugin marketplace add ./
claude plugin install multi-model-team@multi-model-team-marketplace
```

Verify it loaded:

```bash
claude plugin details multi-model-team@multi-model-team-marketplace
# Agents (5) reasoner, worker, reviewer, codex-worker, codex-reviewer · Hooks (1) SessionStart · + commands & skill
```

### Optional: enable the Codex agents

`codex-worker` and `codex-reviewer` shell out to the OpenAI Codex CLI. They stay
dormant unless it is installed:

```bash
npm install -g @openai/codex
codex login
```

`/team-status` reports whether the CLI was found, and the SessionStart banner shows
the agents as `비활성` (inactive) when it is missing. Everything else in MMT works
without Codex.

---

## Usage

### Just ask in natural language

The `orchestration-protocol` skill triggers on its own, but you can also delegate explicitly:

```
Have reasoner analyze the root cause of this race condition.
Ask worker to generate test skeletons for these functions.
```

Run `/team-status` anytime to see the saved orchestrator model and the current team.

### Run the full orchestration workflow

```
/orchestrate Add item-stack merge logic to the inventory system and write the tests.
```

Internally this runs:

1. **Plan** — the orchestrator breaks the request into `[reasoner]` / `[worker]` / `[reviewer]` subtasks and shows you the split.
2. **Delegate** — independent subtasks go out in parallel, dependent ones are chained. The orchestrator never implements directly.
3. **Synthesize** — all results are merged into one coherent answer with next steps.

Add `--plan-only` to stop after the plan for your approval before any delegation (e.g. `/orchestrate --plan-only <task>`).

### Delegate to Codex instead of Claude

```
/orchestrate --codex Rename these fields across the module and update the tests.
/orchestrate --cross-review Merge the item stacks and review the diff.
```

- `--codex` routes mechanical subtasks to `codex-worker` and the review step to
  `codex-reviewer`. Reasoning still goes to `reasoner`.
- `--cross-review` runs `reviewer` (Opus) and `codex-reviewer` (Codex) **in parallel**
  on the same diff and reports the union of their findings. Where the two disagree,
  the orchestrator sends that specific point to `reasoner` to adjudicate rather than
  picking a side.

You can also delegate in natural language: *"codex-reviewer한테 이 diff 검토시켜줘."*

Both Codex agents are drivers, not implementers. They hand a self-contained spec to
`codex exec`, then **independently verify** what came back — re-reading the changed
files, re-running the tests, and dropping any review finding they cannot corroborate
in the source. Codex's own claim that "tests pass" is never taken at face value.

Sandboxing is enforced per role: `codex-worker` runs Codex with `-s workspace-write`
(can edit files in the project, no network), `codex-reviewer` with `-s read-only`.
Set `MMT_CODEX_MODEL` (or `MMT_CODEX_WORKER_MODEL` / `MMT_CODEX_REVIEWER_MODEL`) to
pin a specific Codex model, and `MMT_CODEX_BIN` if the binary is not on `PATH`.

> **Read-only caveat:** `reviewer` (Opus) has no `Bash` at all, so it *cannot* mutate
> anything. `codex-reviewer` needs `Bash` to launch the Codex CLI, so its read-only
> guarantee comes from Codex's own sandbox plus its instructions, not from the tool
> allowlist. When you want the hard guarantee, use `reviewer`.

---

## Choosing the orchestrator model: Opus vs Fable 5

```
/orchestrator-model            # shows a comparison and asks
/orchestrator-model opus       # everyday default; baseline cost & usage
/orchestrator-model fable      # long-horizon / ambiguous autonomous work only
```

|  | Opus 4.8 | Fable 5 |
|---|---|---|
| Character | Always-available top-tier stable model | A tier above Opus; for very long / ambiguous problems |
| Cost | Baseline | ~2× Opus, and burns usage ~2× faster |
| Thinking | Adjustable via effort | Always on (cannot be disabled) |
| Best for | Most coding / debugging / design work | Long autonomous tasks — hand it a goal and let it research, plan, and verify by itself |
| Note | — | May auto-fall back to Opus if safety-classified content is detected (`/model fable` to return) |

Your choice is saved to the project's `.claude/settings.local.json` (`model` +
`effortLevel`) and applies **from the next session onward**. To apply it immediately in
the *current* session, type `/model opus` or `/model fable` yourself.

> **Note on effort:** `effortLevel` in settings accepts `low` / `medium` / `high` /
> `xhigh` — **not `max`**, which works only within a session. For a single very hard
> task, type `/effort max` during the session.

---

## Components

```
multi-model-team/
├── .claude-plugin/
│   ├── plugin.json          # plugin metadata
│   └── marketplace.json     # self-referencing marketplace for local install
├── agents/
│   ├── reasoner.md       # model: opus, effort: max
│   ├── worker.md         # model: sonnet, effort: medium
│   ├── reviewer.md       # model: opus, effort: high, read-only
│   ├── codex-worker.md   # drives `codex exec` (workspace-write)
│   └── codex-reviewer.md # drives `codex exec review` (read-only)
├── scripts/
│   └── codex-run.js     # Codex CLI wrapper — binary lookup, sandbox, timeout, output
├── skills/
│   └── orchestration-protocol/SKILL.md   # role-separation rules, auto-trigger
├── commands/
│   ├── orchestrate.md        # /orchestrate <task> [--plan-only] [--codex] [--cross-review]
│   ├── orchestrator-model.md # /orchestrator-model [opus|fable]
│   └── team-status.md        # /team-status
├── hooks/
│   ├── hooks.json            # registers the SessionStart hook
│   └── session-start-reminder.js   # Node script — no bash/python deps, cross-platform
├── evals/                    # provisional `claude plugin eval` suite
├── .github/                  # CI workflow
├── LICENSE
├── README.md
└── CHANGELOG.md
```

The SessionStart hook is a **Node** script (Claude Code ships with Node), so it runs
identically on Windows, macOS, and Linux with no `bash` or `python3` dependency.

---

## Customization tips

- Lower `worker`'s `effort` to `low` for cheaper/faster grunt work. Valid effort
  levels: `low` / `medium` / `high` / `xhigh` / `max` (availability depends on the model).
- Add `isolation: worktree` to `reasoner` to let it experiment safely in a separate
  git worktree.
- Narrow each agent's `tools` (e.g. a docs-only agent gets just `Read, Grep, Glob`) to
  minimize its permissions.
- Valid `model` aliases: `sonnet`, `opus`, `haiku`, `fable` (or a full model ID, or `inherit`).

---

## License

[MIT](LICENSE) © 유성
