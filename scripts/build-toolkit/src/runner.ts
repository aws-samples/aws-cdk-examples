import { spawn } from 'node:child_process';
import { StepResult, StepName } from './types';

export function runStep(name: StepName, cmd: string, args: string[], cwd: string, timeoutMs = 300_000): Promise<StepResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      env: { ...process.env },
    });

    const chunks: Buffer[] = [];
    proc.stdout.on('data', (d) => chunks.push(d));
    proc.stderr.on('data', (d) => chunks.push(d));

    proc.on('close', (code) => {
      resolve({
        name,
        success: code === 0,
        durationMs: Date.now() - start,
        output: Buffer.concat(chunks).toString().slice(-8000), // keep last 8k
      });
    });

    proc.on('error', (err) => {
      resolve({
        name,
        success: false,
        durationMs: Date.now() - start,
        output: err.message,
      });
    });
  });
}
