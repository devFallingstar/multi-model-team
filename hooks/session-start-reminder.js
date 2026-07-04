#!/usr/bin/env node
// multi-model-team SessionStart 훅.
// .claude/settings.local.json 을 읽어 현재 오케스트레이터 기본값을 안내한다.
// bash/python3 같은 외부 의존성 없이 Node 표준 모듈만 사용 → Windows/macOS/Linux 공통 동작.
// (Claude Code 자체가 Node 기반이라 node 실행기는 항상 존재한다.)

'use strict';
const fs = require('fs');
const path = require('path');

const base = process.env.CLAUDE_PROJECT_DIR || '.';
const settingsFile = path.join(base, '.claude', 'settings.local.json');

let model = '';
let effort = '';
try {
  const raw = fs.readFileSync(settingsFile, 'utf8').replace(/^﻿/, '');
  const data = JSON.parse(raw);
  model = typeof data.model === 'string' ? data.model : '';
  effort = typeof data.effortLevel === 'string' ? data.effortLevel : '';
} catch (e) {
  // 파일이 없거나 파싱 실패 → 미설정으로 취급.
}

const lines = [];
lines.push('[MMT] Multi Model Team 플러그인 로드됨.');
lines.push('');

if (model) {
  lines.push(`  오케스트레이터(당신) : 프로젝트 기본값 = ${model} (effort: ${effort || '기본값'})`);
  lines.push(`                          지금 세션에 바로 적용하려면 /model ${model} 직접 입력`);
} else {
  lines.push('  오케스트레이터(당신) : 아직 미설정 -> /orchestrator-model 로 Opus/Fable5 중 선택');
  lines.push('                          (또는 직접 /model opus 나 /model fable)');
}

lines.push('  reasoner              : Opus 고정 서브에이전트 (어려운 디버깅 / 알고리즘·아키텍처 설계)');
lines.push('  worker                : Sonnet 고정 서브에이전트 (보일러플레이트 / 테스트 / 포맷팅 / 단순 수정)');
lines.push('  reviewer              : Opus 고정 읽기 전용 서브에이전트 (커밋 전 diff 검토 — 정확성/엣지케이스/보안)');
lines.push('');
lines.push('  큰 작업은 /orchestrate <작업 설명> 으로 시작하면 계획->분배->종합 순서로 진행됩니다.');

process.stdout.write(lines.join('\n') + '\n');
