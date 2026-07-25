import { createTargetVersions } from './targets';

describe('createTargetVersions', () => {
  test('matches released cdk init ecosystem formats', () => {
    const targets = createTargetVersions({
      'aws-cdk-lib': '^2.262.0',
      constructs: '^10.5.0',
    }, '2.1133.0', 'fixture');

    expect(targets).toMatchObject({
      source: 'fixture',
      cdkCli: '2.1133.0',
      base: { cdkLib: '2.262.0', constructs: '10.5.0' },
      python: {
        cdkLib: '>=2.262.0,<3.0.0',
        constructs: '>=10.5.0,<11.0.0',
      },
      java: {
        cdkLib: '[2.262.0,3.0.0)',
        constructs: '[10.5.0,11.0.0)',
      },
      go: { cdkLib: 'v2.262.0', constructs: 'v10.5.0' },
      csharp: { cdkLib: '[2.262.0,3.0.0)', constructs: '10.*' },
    });
  });

  test('rejects target syntax the transformer cannot safely interpret', () => {
    expect(() => createTargetVersions({
      'aws-cdk-lib': '~2.262.0',
      constructs: '^10.5.0',
    }, '2.1133.0')).toThrow('Unsupported aws-cdk-lib init version');
  });
});
