#!/usr/bin/env node
// multi-model-team — Codex CLI 러너.
//
// codex-worker / codex-reviewer 서브에이전트가 OpenAI Codex CLI(`codex exec`)를
// 비대화형으로 호출할 때 쓰는 얇은 래퍼. Node 표준 모듈만 사용하므로
// Windows / macOS / Linux에서 동일하게 동작한다.
//
// 사용법:
//   node codex-run.js --check
//   node codex-run.js --role worker   [--model M] [--cd DIR] [--timeout SEC] [--verbose]
//   node codex-run.js --role reviewer [--model M] [--cd DIR] [--timeout SEC] [--verbose]
//                                     [--review-diff uncommitted|base=BRANCH|commit=SHA]
//
// 프롬프트는 stdin으로 넘긴다(따옴표/개행 이스케이프 문제 없음):
//   node codex-run.js --role worker <<'EOF'
//   ...작업 지시...
//   EOF
// 또는 --prompt-file <경로>.
//
// 종료 코드: 0 성공 / 1 인자 오류 / 2 codex 미설치 / 3 타임아웃 / 4 codex 실패

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const EXIT = { OK: 0, USAGE: 1, NO_CODEX: 2, TIMEOUT: 3, FAILED: 4 };
const DEFAULT_TIMEOUT_SEC = 900;

function die(code, msg) {
  process.stderr.write(msg.replace(/\n?$/, '\n'));
  process.exit(code);
}

// --- codex 실행 파일 탐색 -----------------------------------------------
// PATH를 직접 훑어서 codex / codex.cmd / codex.exe 를 찾는다.
// (`which`/`where` 같은 외부 명령에 의존하지 않기 위함)
function resolveCodex() {
  const override = process.env.MMT_CODEX_BIN;
  if (override) return fs.existsSync(override) ? override : null;

  const isWin = process.platform === 'win32';
  const exts = isWin
    ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);

  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, 'codex' + ext.toLowerCase());
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch (_) {
        /* 다음 후보 */
      }
    }
  }
  return null;
}

// Windows의 .cmd/.bat 셰임은 shell 경유로만 실행 가능하다.
function needsShell(exe) {
  return /\.(cmd|bat)$/i.test(exe);
}

function quoteWin(arg) {
  return /[\s"&|<>^()]/.test(arg) ? '"' + arg.replace(/"/g, '""') + '"' : arg;
}

function runCodex(exe, args, { input, cwd, timeoutMs, verbose }) {
  const shell = needsShell(exe);
  const cmd = shell ? quoteWin(exe) : exe;
  const argv = shell ? args.map(quoteWin) : args;

  return spawnSync(cmd, argv, {
    input,
    cwd,
    shell,
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'utf8',
    stdio: ['pipe', verbose ? 'inherit' : 'pipe', 'pipe'],
  });
}

// --- 인자 파싱 -----------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    role: '',
    model: '',
    cd: '',
    timeoutSec: 0,
    verbose: false,
    check: false,
    reviewDiff: '',
    promptFile: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) die(EXIT.USAGE, `[codex-run] ${a} 뒤에 값이 필요합니다.`);
      return v;
    };
    switch (a) {
      case '--check': opts.check = true; break;
      case '--role': opts.role = next(); break;
      case '--model': opts.model = next(); break;
      case '--cd': opts.cd = next(); break;
      case '--timeout': opts.timeoutSec = Number(next()); break;
      case '--verbose': opts.verbose = true; break;
      case '--review-diff': opts.reviewDiff = next(); break;
      case '--prompt-file': opts.promptFile = next(); break;
      case '-h':
      case '--help':
        process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n')
          .slice(1, 20).map((l) => l.replace(/^\/\/ ?/, '')).join('\n') + '\n');
        process.exit(EXIT.OK);
        break;
      default:
        die(EXIT.USAGE, `[codex-run] 알 수 없는 인자: ${a}`);
    }
  }
  return opts;
}

function resolveModel(role, explicit) {
  if (explicit) return explicit;
  const perRole = role === 'reviewer'
    ? process.env.MMT_CODEX_REVIEWER_MODEL
    : process.env.MMT_CODEX_WORKER_MODEL;
  return perRole || process.env.MMT_CODEX_MODEL || '';
}

// 모델명/브랜치명은 shell 경유 실행이 있으므로 화이트리스트로 검증한다.
function assertSafe(label, value, re) {
  if (!re.test(value)) die(EXIT.USAGE, `[codex-run] 허용되지 않는 ${label} 값: ${value}`);
  return value;
}

function tail(text, n) {
  const lines = (text || '').trimEnd().split('\n');
  return lines.slice(-n).join('\n');
}

// Codex가 뱉는 흔한 실패를 사람이 읽을 수 있는 조치로 번역한다.
function hintFor(stderr) {
  const s = stderr || '';
  if (/requires a newer version of Codex/i.test(s)) {
    return '~/.codex/config.toml 의 기본 모델이 설치된 CLI보다 최신입니다. ' +
      'Codex CLI를 업그레이드하거나(npm install -g @openai/codex@latest), ' +
      'MMT_CODEX_MODEL 환경변수로 이 CLI가 지원하는 모델을 지정하세요.';
  }
  if (/not supported when using Codex with a ChatGPT account|401|unauthorized/i.test(s)) {
    return '현재 Codex 계정으로는 요청한 모델을 쓸 수 없습니다. `codex login` 으로 재인증하거나 ' +
      'MMT_CODEX_MODEL 환경변수로 이 계정이 지원하는 모델을 지정하세요.';
  }
  if (/not a git repository/i.test(s)) {
    return 'codex exec review 는 git 저장소 안에서만 동작합니다. --review-diff 없이 일반 리뷰로 다시 시도하세요.';
  }
  return '';
}

// --- main ---------------------------------------------------------------
function main() {
  const opts = parseArgs(process.argv.slice(2));
  const exe = resolveCodex();

  if (opts.check) {
    if (!exe) {
      process.stdout.write('codex: NOT_FOUND\n');
      process.exit(EXIT.NO_CODEX);
    }
    const v = spawnSync(needsShell(exe) ? quoteWin(exe) : exe, ['--version'], {
      shell: needsShell(exe), encoding: 'utf8', windowsHide: true, timeout: 15000,
    });
    process.stdout.write(`codex: OK\npath: ${exe}\nversion: ${(v.stdout || '').trim() || 'unknown'}\n`);
    const envModel = process.env.MMT_CODEX_MODEL || '';
    process.stdout.write(`MMT_CODEX_MODEL: ${envModel || '(미설정 — codex 기본 모델 사용)'}\n`);
    process.exit(EXIT.OK);
  }

  if (opts.role !== 'worker' && opts.role !== 'reviewer') {
    die(EXIT.USAGE, '[codex-run] --role worker 또는 --role reviewer 가 필요합니다.');
  }
  if (!exe) {
    die(
      EXIT.NO_CODEX,
      '[codex-run] Codex CLI를 찾지 못했습니다.\n' +
        '  설치: npm install -g @openai/codex   (또는 brew install codex)\n' +
        '  로그인: codex login\n' +
        '  경로가 PATH에 없다면 MMT_CODEX_BIN 환경변수로 실행 파일을 직접 지정하세요.\n' +
        '  이 작업은 Codex 없이 진행할 수 없으니 오케스트레이터에게 worker/reviewer(Claude) 위임을 요청하세요.'
    );
  }

  let prompt = '';
  if (opts.promptFile) {
    try {
      prompt = fs.readFileSync(opts.promptFile, 'utf8');
    } catch (e) {
      die(EXIT.USAGE, `[codex-run] 프롬프트 파일을 읽을 수 없습니다: ${opts.promptFile}`);
    }
  } else {
    try {
      prompt = fs.readFileSync(0, 'utf8');
    } catch (e) {
      prompt = '';
    }
  }
  if (!prompt.trim()) {
    die(EXIT.USAGE, '[codex-run] 프롬프트가 비어 있습니다 (stdin 또는 --prompt-file).');
  }

  const cwd = opts.cd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!fs.existsSync(cwd)) die(EXIT.USAGE, `[codex-run] 작업 디렉터리가 없습니다: ${cwd}`);

  const timeoutMs = (opts.timeoutSec > 0 ? opts.timeoutSec : DEFAULT_TIMEOUT_SEC) * 1000;
  const model = resolveModel(opts.role, opts.model);
  if (model) assertSafe('--model', model, /^[A-Za-z0-9._:\/-]+$/);

  const outFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-codex-')),
    'last-message.txt'
  );

  const args = ['exec'];

  if (opts.role === 'reviewer' && opts.reviewDiff) {
    // `codex exec review`는 git 저장소의 변경분을 대상으로 구조화된 리뷰를 수행한다.
    args.push('review');
    if (opts.reviewDiff === 'uncommitted') {
      args.push('--uncommitted');
    } else if (opts.reviewDiff.startsWith('base=')) {
      args.push('--base', assertSafe('--review-diff base', opts.reviewDiff.slice(5), /^[A-Za-z0-9._\/-]+$/));
    } else if (opts.reviewDiff.startsWith('commit=')) {
      args.push('--commit', assertSafe('--review-diff commit', opts.reviewDiff.slice(7), /^[A-Za-z0-9]+$/));
    } else {
      die(EXIT.USAGE, `[codex-run] --review-diff 는 uncommitted | base=BRANCH | commit=SHA 만 허용합니다: ${opts.reviewDiff}`);
    }
    // review 서브커맨드에는 -s 플래그가 없으므로 config 오버라이드로 읽기 전용을 강제한다.
    args.push('-c', 'sandbox_mode="read-only"');
  } else {
    // 일반 exec. worker만 워크스페이스 쓰기 권한을 갖는다.
    args.push('--skip-git-repo-check', '--color', 'never');
    args.push('-s', opts.role === 'worker' ? 'workspace-write' : 'read-only');
    args.push('--cd', cwd);
  }

  if (model) args.push('--model', model);
  args.push('-o', outFile, '-'); // 프롬프트는 stdin에서 읽는다

  const res = runCodex(exe, args, { input: prompt, cwd, timeoutMs, verbose: opts.verbose });

  if (res.error && res.error.code === 'ETIMEDOUT') {
    die(EXIT.TIMEOUT, `[codex-run] Codex가 ${timeoutMs / 1000}초 안에 끝나지 않아 중단했습니다. 작업을 더 작게 쪼개서 다시 위임하세요.`);
  }
  if (res.error) {
    die(EXIT.FAILED, `[codex-run] Codex 실행 실패: ${res.error.message}`);
  }

  let last = '';
  try {
    last = fs.readFileSync(outFile, 'utf8').trim();
  } catch (_) {
    /* codex가 최종 메시지를 남기지 못한 경우 */
  }

  if (res.status !== 0) {
    process.stderr.write(`[codex-run] Codex가 exit code ${res.status}로 종료했습니다.\n`);
    const hint = hintFor(res.stderr);
    if (hint) process.stderr.write(`[codex-run] 조치: ${hint}\n`);
    const err = tail(res.stderr, 40);
    if (err) process.stderr.write('--- codex stderr (tail) ---\n' + err + '\n');
    if (last) process.stdout.write('--- CODEX OUTPUT (partial) ---\n' + last + '\n');
    process.exit(EXIT.FAILED);
  }

  if (!last) {
    // 최종 메시지 파일이 비었으면 stdout 캡처분으로 폴백.
    last = tail(res.stdout, 200) || '(Codex가 아무 출력도 남기지 않았습니다.)';
  }

  process.stdout.write('--- CODEX OUTPUT ---\n' + last + '\n--- END CODEX OUTPUT ---\n');
  process.exit(EXIT.OK);
}

main();
