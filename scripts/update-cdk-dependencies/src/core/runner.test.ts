import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTargetVersions } from './targets';
import { executePlans } from './runner';

const targets = createTargetVersions({
  'aws-cdk-lib': '^2.262.0',
  constructs: '^10.5.0',
}, '2.1133.0');

describe('executePlans', () => {
  test('preflights every file before applying a multi-file plan', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cdk-runner-'));
    const first = join(root, 'requirements.txt');
    const second = join(root, 'pyproject.toml');
    await Promise.all([
      writeFile(first, 'old requirements\n'),
      writeFile(second, 'concurrent pyproject\n'),
    ]);

    const report = await executePlans([{
      language: 'python',
      manifestPath: first,
      status: 'would-update',
      changes: [],
      updates: [
        { path: first, before: 'old requirements\n', after: 'new requirements\n' },
        { path: second, before: 'old pyproject\n', after: 'new pyproject\n' },
      ],
    }], 'write', targets);

    expect(report.summary.errors).toBe(1);
    expect(await readFile(first, 'utf8')).toBe('old requirements\n');
    expect(await readFile(second, 'utf8')).toBe('concurrent pyproject\n');
  });
});
