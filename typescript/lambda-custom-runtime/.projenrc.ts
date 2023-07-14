import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.85.0',
  defaultReleaseBranch: 'main',
  name: 'lambda-custom-runtime',
  projenrcTs: true,
});

const common_exclude = ['cdk.out', 'cdk.context.json', 'yarn-error.log', '.mergify.yml', '.github'];

project.npmignore!.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);


project.synth();