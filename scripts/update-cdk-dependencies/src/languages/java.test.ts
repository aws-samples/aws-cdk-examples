import { createTargetVersions } from '../core/targets';
import { updatePomContent } from './java';

const targets = createTargetVersions({
  'aws-cdk-lib': '^2.262.0',
  constructs: '^10.5.0',
}, '2.1133.0');

describe('Java adapter', () => {
  test('updates referenced version properties and preserves surrounding XML', () => {
    const input = `<project>\n  <properties>\n    <cdk.version>2.171.1</cdk.version>\n    <constructs.version>[10.0.0,11.0.0)</constructs.version>\n  </properties>\n  <dependencies>\n    <dependency><groupId>software.amazon.awscdk</groupId><artifactId>aws-cdk-lib</artifactId><version>\${cdk.version}</version></dependency>\n    <dependency><groupId>software.constructs</groupId><artifactId>constructs</artifactId><version>\${constructs.version}</version></dependency>\n  </dependencies>\n</project>\n`;
    const result = updatePomContent(input, targets);
    expect(result.content).toContain('<cdk.version>[2.262.0,3.0.0)</cdk.version>');
    expect(result.content).toContain('<constructs.version>[10.5.0,11.0.0)</constructs.version>');
    expect(result.content.split('\n')).toHaveLength(input.split('\n').length);
    expect(updatePomContent(result.content, targets).changes).toHaveLength(0);
  });

  test('updates direct dependency ranges', () => {
    const input = `<project><dependencies>
<dependency><groupId>software.amazon.awscdk</groupId><artifactId>aws-cdk-lib</artifactId><version>[2.0.0,)</version></dependency>
<dependency><groupId>software.constructs</groupId><artifactId>constructs</artifactId><version>[10.0.0,)</version></dependency>
</dependencies></project>`;
    const result = updatePomContent(input, targets);
    expect(result.content).toContain('<version>[2.262.0,3.0.0)</version>');
    expect(result.content).toContain('<version>[10.5.0,11.0.0)</version>');
  });

  test('rejects ambiguous duplicate CDK dependencies', () => {
    const dependency = '<dependency><groupId>software.amazon.awscdk</groupId><artifactId>aws-cdk-lib</artifactId><version>2.0.0</version></dependency>';
    expect(() => updatePomContent(`<project>${dependency}${dependency}</project>`, targets))
      .toThrow('Expected one software.amazon.awscdk:aws-cdk-lib dependency');
  });
});
