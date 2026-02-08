import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '..');
const backendDir = path.join(repoRoot, 'backend');
const frontendEnvPath = path.join(frontendDir, '.env');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const backendEnvPath = path.join(backendDir, '.env');
const backendEnv = loadEnvFile(backendEnvPath);
const mergedBackendEnv = { ...process.env, ...backendEnv };

const frontendEnv = loadEnvFile(frontendEnvPath);
const mergedFrontendEnv = { ...process.env, ...frontendEnv };

const backendHost = mergedBackendEnv.BACKEND_HOST || '127.0.0.1';
const backendPort = mergedBackendEnv.BACKEND_PORT || '8000';
const python = mergedBackendEnv.BACKEND_PYTHON || 'python';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [];

function startBackend() {
  const child = spawn(
    python,
    ['-m', 'uvicorn', 'main:app', '--reload', '--host', backendHost, '--port', String(backendPort)],
    { cwd: backendDir, stdio: 'inherit', env: mergedBackendEnv }
  );
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });
}

function startFrontend() {
  const child = spawn(npmCmd, ['run', 'dev'], { cwd: frontendDir, stdio: 'inherit', env: mergedFrontendEnv });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });
}

function shutdown(signal) {
  for (const child of children) {
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`[dev:all] Backend: ${backendHost}:${backendPort} (${backendEnvPath})`);
console.log(`[dev:all] Frontend env: ${frontendEnvPath}`);
startBackend();
startFrontend();
