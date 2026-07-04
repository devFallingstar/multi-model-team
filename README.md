# model-team

**Read this in other languages: [English](README.md) · [한국어](README.ko.md)**

> A Claude Code plugin that splits work across a **team of models** — a high-level
> orchestrator plans and delegates, an Opus specialist does the hard reasoning, and
> a Sonnet worker handles the mechanical work. Right model for the right job.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-5A67D8)

---

## Why use this?

When one model handles an entire task, you're always paying the wrong price somewhere:
a top-tier model burns expensive, high-effort tokens writing boilerplate, or a cheap
model makes a bad architectural call it wasn't equipped for. **model-team fixes the
allocation problem** by assigning each kind of work to the model that fits it.

| Benefit | How model-team delivers it |
|---|---|
| 💸 **Lower cost, same quality** | Boilerplate/tests/formatting go to Sonnet (`worker`); only genuinely hard reasoning goes to Opus at `max` effort (`reasoner`). You stop paying max-effort rates for mechanical edits. |
| 🧠 **Better decisions on hard problems** | Root-cause debugging, algorithm/architecture design, and concurrency issues are *always* routed to a dedicated max-effort Opus agent — not squeezed in between trivial edits. |
| 🎛️ **The orchestrator stays high-level** | The main session only **plans, delegates, and synthesizes** — it doesn't get dragged into implementation, so its context stays clean and focused. |
| ⚡ **Parallel throughput** | Independent subtasks are delegated concurrently (e.g. `reasoner` designs an algorithm while `worker` scaffolds the tests). |
| 👀 **Transparent by default** | A SessionStart hook prints the current team setup every session, so you always know which model is orchestrating and how to switch. |

---

## The team

| Role | Model | Responsibility |
|---|---|---|
| **Orchestrator** (main session) | **Opus 4.8** or **Fable 5** — you choose (`/orchestrator-model`) | Planning, delegation, and synthesis **only**. Does not implement. |
| `reasoner` subagent | Opus, fixed (`model: opus`, `effort: max`) | Hard debugging, algorithm & architecture design, "why does this happen" questions. |
| `worker` subagent | Sonnet, fixed (`model: sonnet`, `effort: medium`) | Boilerplate, tests, formatting/lint, repetitive edits, simple well-specified fixes. |

The **role-separation rules** are enforced by the `orchestration-protocol` skill, which
triggers automatically on coding/design/debugging requests — so the orchestrator
delegates instead of silently doing the work itself.

---

## Quick start

### Install from GitHub

Inside Claude Code:

```
/plugin marketplace add devFallingstar/model-team
/plugin install model-team@model-team-marketplace
/reload-plugins
```

### Install from a local clone

```bash
git clone https://github.com/devFallingstar/model-team.git
cd model-team
claude
```

Inside Claude Code — **the path must use the `./` form**; a bare `.` fails with
`Invalid marketplace source format`:

```
/plugin marketplace add ./
/plugin install model-team@model-team-marketplace
/reload-plugins
```

Or non-interactively from your terminal:

```bash
claude plugin marketplace add ./
claude plugin install model-team@model-team-marketplace
```

Verify it loaded:

```bash
claude plugin details model-team@model-team-marketplace
# Agents (2) reasoner, worker · Hooks (1) SessionStart · + commands & skill
```

---

## Usage

### Just ask in natural language

The `orchestration-protocol` skill triggers on its own, but you can also delegate explicitly:

```
Have reasoner analyze the root cause of this race condition.
Ask worker to generate test skeletons for these functions.
```

### Run the full orchestration workflow

```
/orchestrate Add item-stack merge logic to the inventory system and write the tests.
```

Internally this runs:

1. **Plan** — the orchestrator breaks the request into `[reasoner]` / `[worker]` subtasks and shows you the split.
2. **Delegate** — independent subtasks go out in parallel, dependent ones are chained. The orchestrator never implements directly.
3. **Synthesize** — all results are merged into one coherent answer with next steps.

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
| Best for | Most coding / debugging / design work | Multi-hour autonomous tasks where you hand off a goal and let it research, plan, and verify on its own |
| Note | — | May auto-fall back to Opus if safety-classified content is detected (`/model fable` to return) |

Your choice is saved to the project's `.claude/settings.local.json` (`model` +
`effortLevel`) and applies **from the next session onward**. To apply it immediately in
the *current* session, type `/model opus` or `/model fable` yourself.

> **Note on effort:** `effortLevel` in settings accepts `low` / `medium` / `high` /
> `xhigh` — **not `max`** (that's session-only). For one genuinely hard task, use
> `/effort max` in-session on top of your saved default.

---

## Components

```
model-team/
├── .claude-plugin/
│   ├── plugin.json          # plugin metadata
│   └── marketplace.json     # self-referencing marketplace for local install
├── agents/
│   ├── reasoner.md      # model: opus, effort: max
│   └── worker.md        # model: sonnet, effort: medium
├── skills/
│   └── orchestration-protocol/SKILL.md   # role-separation rules, auto-trigger
├── commands/
│   ├── orchestrate.md        # /orchestrate <task>
│   └── orchestrator-model.md # /orchestrator-model [opus|fable]
├── hooks/
│   ├── hooks.json            # registers the SessionStart hook
│   └── session-start-reminder.js   # Node script — no bash/python deps, cross-platform
├── LICENSE
└── README.md
```

The SessionStart hook is a **Node** script (Claude Code ships with Node), so it runs
identically on Windows, macOS, and Linux with no `bash` or `python3` dependency.

---

## Customization tips

- Lower `worker`'s `effort` to `low` for cheaper/faster grunt work. Valid effort
  levels: `low` / `medium` / `high` / `xhigh` / `max` (availability depends on the model).
- Add `isolation: worktree` to `reasoner` to let it experiment safely in a separate
  git worktree.
- Narrow each agent's `tools` (e.g. a review-only agent gets just `Read, Grep, Glob`) to
  minimize its permissions.
- Valid `model` aliases: `sonnet`, `opus`, `haiku`, `fable` (or a full model ID, or `inherit`).

---

## License

[MIT](LICENSE) © 유성
