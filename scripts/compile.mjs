import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = '0.31.1';
const windows = process.platform === 'win32';
const cache = path.join(root, 'node_modules', '.cache', 'compact-0311');
const linuxCache = windows
  ? spawnSync('wsl', ['wslpath', '-a', cache], { cwd: root, encoding: 'utf8' })
  : null;
if (linuxCache && (linuxCache.error || linuxCache.status !== 0)) {
  throw linuxCache.error ?? new Error(linuxCache.stderr);
}
const directory = linuxCache ? linuxCache.stdout.trim() : cache;
const wslValue = (command, args = []) => {
  const result = spawnSync('wsl', ['--exec', command, ...args], { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr);
  return result.stdout.trim();
};
if (process.argv.includes('--install')) {
  const command = windows ? 'wsl' : (process.env.COMPACT_BIN ?? 'compact');
  const prefix = windows ? ['--exec', `${wslValue('printenv', ['HOME'])}/.local/bin/compact`] : [];
  const result = spawnSync(command, [...prefix, '--directory', directory, 'update', '--no-set-default', version], {
    cwd: root, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const architecture = windows ? wslValue('uname', ['-m']) : (process.arch === 'arm64' ? 'aarch64' : 'x86_64');
const platform = process.platform === 'darwin' ? 'apple-darwin' : 'unknown-linux-musl';
const binaries = `${directory}/versions/${version}/${architecture}-${platform}`;
const searchPath = `${binaries}:${windows ? wslValue('printenv', ['PATH']) : process.env.PATH}`;
const run = (args, capture = false) => {
  const command = windows ? 'wsl' : `${binaries}/compactc.bin`;
  const prefix = windows ? ['--exec', 'env', `PATH=${searchPath}`, `${binaries}/compactc.bin`] : [];
  const result = spawnSync(command, [...prefix, ...args.slice(2)], {
    cwd: root,
    env: { ...process.env, PATH: windows ? process.env.PATH : searchPath },
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result;
};
for (const [flag, expected] of [['--version', version], ['--runtime-version', '0.16.0']]) {
  const result = run(['compile', `+${version}`, flag], true);
  if (result.status !== 0 || result.stdout.trim() !== expected) {
    throw new Error(`Compact ${flag}: expected ${expected}; ${result.stderr || result.stdout}. Run npm run compact:setup first.`);
  }
}
let failed = false;
mkdirSync(path.join(root, 'managed'), { recursive: true });
mkdirSync(path.join(root, 'public', 'managed'), { recursive: true });
for (const name of ['debt', 'split']) {
  const output = path.join(root, 'managed', name);
  const assets = path.join(root, 'public', 'managed', name);
  rmSync(output, { recursive: true, force: true });
  rmSync(assets, { recursive: true, force: true });
  const result = run(['compile', `+${version}`, `contracts/${name}.compact`, `managed/${name}`]);
  if (result.status !== 0) {
    failed = true;
    continue;
  }
  for (const directory of ['keys', 'zkir', 'compiler']) {
    cpSync(path.join(output, directory), path.join(assets, directory), { recursive: true });
  }
}
process.exitCode = failed ? 1 : 0;
