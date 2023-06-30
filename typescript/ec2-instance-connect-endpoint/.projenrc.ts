import { awscdk, JsonFile } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Pahud Hsieh',
  authorAddress: 'pahudnet@gmail.com',
  cdkVersion: '2.85.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.0.0',
  name: 'ec2-instance-connect-endpoint',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/aws-samples/aws-cdk-examples.git',
  deps: [
    '@aws-cdk/integ-tests-alpha@^2.85.0-alpha.0',
    '@aws-cdk/aws-lambda-python-alpha@^2.85.0-alpha.0',
  ],
  devDeps: [
    'aws-cdk@2.85.0',
  ],
});

// required for vscode eslint extension to locate the tsconfig correctly
project.eslint!.config.parserOptions.tsconfigRootDir = 'typescript/ec2-instance-connect-endpoint';
/**
 * reset tsconfigRootDir to null as a workaround for eslint CLI
 * see https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-493187240
 */
const tasksJson = project.tryFindObjectFile('.projen/tasks.json')!;
tasksJson.addOverride('tasks.eslint.steps.0.exec', 'eslint --ext .ts,.tsx --fix --no-error-on-unmatched-pattern src test build-tools projenrc .projenrc.ts --parser-options={tsconfigRootDir:null}');

new JsonFile(project, 'cdk.json', {
  obj: {
    app: 'npx ts-node --prefer-ts-exts src/integ.default.ts',
  },
});

project.addTask('compile-only', {
  description: 'full build',
  steps: [
    { spawn: 'default' },
    { spawn: 'pre-compile' },
    { spawn: 'compile' },
  ],
});
/**
 * As aws-cdk-examples run `npm build` in docker with jsii/superchain image, our integration test will require `docker build`
 * for container assets bundling and this will fail with "docker daemon not running" error. To workaroud this, we create a
 * `compile-only` task and trigger it with `npm build` to avoid this error. You will need to run `npx projen build` to trigger
 * a full build with `test` and `package` instead.
 */
project.setScript('build', 'npx projen compile-only');

const common_exclude = ['cdk.out', 'cdk.context.json', 'yarn-error.log'];
project.npmignore?.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();