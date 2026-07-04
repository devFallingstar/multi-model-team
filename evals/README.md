# Evals (provisional)

This eval suite is **provisional**. `claude plugin eval` is early-access, so the
prompt/grader schema and CLI behavior may change without notice — treat anything
here as a draft, not a stable contract.

Each eval case is a directory with a `prompt.md` (the task given to a fresh session)
and one or more `graders/*.md` (an LLM-graded rubric applied to the resulting
transcript/diff). Run the suite with:

```bash
claude plugin eval .
```

The purpose of `delegation/` is to regression-test the core promise of this
plugin: that the orchestrator plans and delegates rather than implementing
multi-step work inline itself.
