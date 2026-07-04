# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
