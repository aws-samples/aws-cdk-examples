import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executePlans } from '../core/runner';
import { createTargetVersions } from '../core/targets';
import { createGoAdapter } from './go';

const targets = createTargetVersions({
  'aws-cdk-lib': '^2.262.0',
  constructs: '^10.5.0',
}, '2.1133.0');

const oldMod = `module example

go 1.24

require (
  github.com/aws/aws-cdk-go/awscdk/v2 v2.118.0
  github.com/aws/constructs-go/constructs/v10 v10.3.0
)
`;

describe('Go adapter', () => {
  test('ignores cdk.out and plans exact CDK plus minimum Constructs updates', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cdk-go-adapter-'));
    const app = join(root, 'go', 'app');
    const generated = join(root, 'go', 'app', 'cdk.out', 'asset');
    await Promise.all([mkdir(app, { recursive: true }), mkdir(generated, { recursive: true })]);
    await Promise.all([
      writeFile(join(app, 'go.mod'), oldMod),
      writeFile(join(generated, 'go.mod'), oldMod),
    ]);
    const plans = await createGoAdapter().scan({ repoRoot: root, targets });
    expect(plans).toHaveLength(1);
    expect(plans[0].changes).toEqual([
      expect.objectContaining({ dependency: 'github.com/aws/aws-cdk-go/awscdk/v2', to: 'v2.262.0' }),
      expect.objectContaining({ dependency: 'github.com/aws/constructs-go/constructs/v10', to: expect.stringContaining('v10.5.0') }),
    ]);
  });

  test('restores go.mod and go.sum when a package-manager command fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cdk-go-rollback-'));
    const app = join(root, 'go', 'app');
    await mkdir(app, { recursive: true });
    const modPath = join(app, 'go.mod');
    const sumPath = join(app, 'go.sum');
    await Promise.all([writeFile(modPath, oldMod), writeFile(sumPath, 'original sum\n')]);

    const invocations: string[][] = [];
    const adapter = createGoAdapter(async (_command, args, cwd) => {
      invocations.push([...args]);
      await Promise.all([
        writeFile(join(cwd, 'go.mod'), 'mutated\n'),
        writeFile(join(cwd, 'go.sum'), 'mutated sum\n'),
      ]);
      if (invocations.length === 2) {
        throw new Error('tidy failed');
      }
    });
    const plans = await adapter.scan({ repoRoot: root, targets });
    const report = await executePlans(plans, 'write', targets);
    expect(report.summary.errors).toBe(1);
    expect(await readFile(modPath, 'utf8')).toBe(oldMod);
    expect(invocations[0]).toEqual([
      'get',
      'github.com/aws/aws-cdk-go/awscdk/v2@v2.262.0',
    ]);
    expect(await readFile(sumPath, 'utf8')).toBe('original sum\n');
  });
});
