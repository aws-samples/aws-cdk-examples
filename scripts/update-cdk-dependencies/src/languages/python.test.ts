import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executePlans } from '../core/runner';
import { createTargetVersions } from '../core/targets';
import { pythonAdapter, updatePyprojectContent, updateRequirementsContent } from './python';

const targets = createTargetVersions({
  'aws-cdk-lib': '^2.262.0',
  constructs: '^10.5.0',
}, '2.1133.0');

describe('Python adapter', () => {
  test('preserves comments, markers, extras, and unrelated dependencies', () => {
    const input = [
      'aws-cdk-lib>=2.0.0 # keep this comment',
      'constructs >=10.0.0; python_version >= "3.9"',
      'boto3==1.40.0',
      '',
    ].join('\n');
    const result = updateRequirementsContent(input, targets);
    expect(result.content).toBe([
      'aws-cdk-lib>=2.262.0,<3.0.0 # keep this comment',
      'constructs >=10.5.0,<11.0.0; python_version >= "3.9"',
      'boto3==1.40.0',
      '',
    ].join('\n'));
    expect(result.changes).toHaveLength(2);
    expect(updateRequirementsContent(result.content, targets).changes).toHaveLength(0);
  });

  test('updates only dependency strings in pyproject content', () => {
    const input = 'dependencies = [\n  "aws-cdk-lib>=2.0.0,<3",\n  "constructs>=10.0.0,<11",\n  "requests>=2"\n]\n';
    const result = updatePyprojectContent(input, targets);
    expect(result.content).toContain('"aws-cdk-lib>=2.262.0,<3.0.0"');
    expect(result.content).toContain('"constructs>=10.5.0,<11.0.0"');
    expect(result.content).toContain('"requests>=2"');
  });

  test('discovers app manifests, ignores generated/runtime manifests, writes both files, and is idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cdk-python-adapter-'));
    const app = join(root, 'python', 'app');
    const generated = join(app, 'cdk.out', 'asset');
    const runtime = join(root, 'python', 'runtime');
    await Promise.all([
      mkdir(app, { recursive: true }),
      mkdir(generated, { recursive: true }),
      mkdir(runtime, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(app, 'requirements.txt'), 'aws-cdk-lib==2.1.0\nconstructs>=10.0.0\n'),
      writeFile(join(app, 'pyproject.toml'), 'dependencies = ["aws-cdk-lib==2.1.0", "constructs>=10.0.0"]\n'),
      writeFile(join(generated, 'requirements.txt'), 'aws-cdk-lib==1.0.0\n'),
      writeFile(join(runtime, 'requirements.txt'), 'boto3==1.40.0\n'),
    ]);

    const first = await pythonAdapter.scan({ repoRoot: root, targets });
    expect(first).toHaveLength(1);
    expect(first[0].status).toBe('would-update');
    const report = await executePlans(first, 'write', targets);
    expect(report.summary.updated).toBe(1);
    expect(await readFile(join(app, 'pyproject.toml'), 'utf8')).toContain('aws-cdk-lib>=2.262.0,<3.0.0');

    const second = await pythonAdapter.scan({ repoRoot: root, targets });
    expect(second[0].status).toBe('up-to-date');
    expect(await readFile(join(generated, 'requirements.txt'), 'utf8')).toBe('aws-cdk-lib==1.0.0\n');
  });
});
