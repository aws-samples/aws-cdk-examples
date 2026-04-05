import { readFile, copyFile, unlink, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Toolkit } from '@aws-cdk/toolkit-lib';
import { StepResult, MessageRecord, Language } from './types';

const FAKE_CONTEXT = resolve(__dirname, '../../fake.context.json');

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function synthProject(projectDir: string, language: Language): Promise<{ step: StepResult; messages: MessageRecord[] }> {
  const messages: MessageRecord[] = [];
  const start = Date.now();
  let copiedFakeCtx = false;
  const ctxPath = join(projectDir, 'cdk.context.json');

  try {
    if (!await exists(ctxPath)) {
      await copyFile(FAKE_CONTEXT, ctxPath);
      copiedFakeCtx = true;
    }

    const cdkJson = JSON.parse(await readFile(join(projectDir, 'cdk.json'), 'utf8'));
    let appCmd: string = cdkJson.app;
    if (!appCmd) throw new Error('No "app" field in cdk.json');

    // Python projects need venv activation prepended
    if (language === 'python' && await exists(join(projectDir, '.venv'))) {
      appCmd = `bash -c "source .venv/bin/activate && ${appCmd}"`;
    }

    const toolkit = new Toolkit({
      ioHost: {
        notify: async (msg) => {
          messages.push({
            level: msg.level,
            message: msg.message,
            timestamp: new Date().toISOString(),
            code: (msg as any).code,
          });
        },
        requestResponse: async (msg) => msg.defaultResponse,
      },
    });

    const savedEnv = { ...process.env };
    process.env.AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';
    process.env.CDK_DEFAULT_REGION = process.env.CDK_DEFAULT_REGION || 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT || '123456789012';

    try {
      const source = await toolkit.fromCdkApp(appCmd, { workingDirectory: projectDir });
      await toolkit.synth(source, { validateStacks: false });
    } finally {
      process.env = savedEnv;
    }

    return {
      step: { name: 'synth', success: true, durationMs: Date.now() - start, output: '' },
      messages,
    };
  } catch (err: any) {
    messages.push({ level: 'error', message: err.message, timestamp: new Date().toISOString() });
    return {
      step: { name: 'synth', success: false, durationMs: Date.now() - start, output: err.message },
      messages,
    };
  } finally {
    if (copiedFakeCtx) {
      await unlink(ctxPath).catch(() => {});
    }
    // Clean up Python venv after synth (matching bash script behavior)
    if (language === 'python') {
      const { rm } = await import('node:fs/promises');
      await rm(join(projectDir, '.venv'), { recursive: true, force: true }).catch(() => {});
    }
  }
}
