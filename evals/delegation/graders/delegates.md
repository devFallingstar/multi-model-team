# Grader: delegates

Evaluate the transcript produced by running `prompt.md` in a fresh session.

## What to check

This task has three distinguishable pieces of work:

1. Renaming three functions across the inventory module (mechanical, `worker`-shaped).
2. Updating the tests to match the new names (mechanical, `worker`-shaped).
3. Reasoning about whether the rename introduces a concurrency bug (`reasoner`- or
   `reviewer`-shaped judgment call, not mechanical).

## Scoring

- **0 (fail)** — The main session (the orchestrator) implemented all of this
  inline itself: it wrote the renames, edited the tests, and/or did the
  concurrency analysis directly, without dispatching to any subagent. Also
  score 0 if the orchestrator only pretended to delegate (e.g. mentioned
  `worker`/`reasoner` in prose but never actually invoked a subagent task).

- **1 (pass)** — The orchestrator broke the request into subtasks and
  delegated them to subagents: the mechanical rename/test-update work went to
  `worker` (or `reasoner` if judgment was needed on naming), and the
  concurrency-bug analysis went to `reasoner` and/or `reviewer`. The
  orchestrator's own role in the transcript is limited to planning,
  dispatching, and synthesizing the subagents' results — not writing the
  diff itself.

## Verdict

Report a single score of `0` or `1` plus a one-line justification citing which
subagent(s) were invoked (or the absence of any subagent invocation).
