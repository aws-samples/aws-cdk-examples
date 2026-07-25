import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTargetVersions } from '../core/targets';
import { csharpAdapter, updateCsprojContent } from './csharp';

const targets = createTargetVersions({
  'aws-cdk-lib': '^2.262.0',
  constructs: '^10.5.0',
}, '2.1133.0');

describe('C# adapter', () => {
  test('updates adjacent attribute and element references without consuming either block', () => {
    const input = `<Project><ItemGroup>
<PackageReference Version="2.0.0" Include="Amazon.CDK.Lib" />
<PackageReference Include="Constructs"><Version>10.0.0</Version></PackageReference>
</ItemGroup></Project>`;
    const result = updateCsprojContent(input, targets);
    expect(result.content).toContain('Version="[2.262.0,3.0.0)" Include="Amazon.CDK.Lib"');
    expect(result.content).toContain('<Version>10.*</Version>');
    expect(result.changes).toHaveLength(2);
    expect(updateCsprojContent(result.content, targets).changes).toHaveLength(0);
  });

  test('reports CDK v1 app and test projects for manual source migration', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cdk-csharp-adapter-'));
    const source = join(root, 'csharp', 'legacy', 'src');
    await mkdir(source, { recursive: true });
    await Promise.all([
      writeFile(join(source, 'App.csproj'), '<Project><PackageReference Include="Amazon.CDK" Version="1.127.0" /></Project>'),
      writeFile(join(source, 'Tests.csproj'), '<Project><PackageReference Include="Amazon.CDK.Assertions" Version="1.127.0" /></Project>'),
      writeFile(join(source, 'Runtime.csproj'), '<Project><PackageReference Include="Amazon.Lambda.Core" Version="2.1.0" /></Project>'),
    ]);
    const plans = await csharpAdapter.scan({ repoRoot: root, targets });
    expect(plans).toHaveLength(2);
    expect(plans.every(plan => plan.status === 'manual-migration-required')).toBe(true);
  });
});
