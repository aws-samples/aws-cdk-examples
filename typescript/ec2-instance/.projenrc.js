const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.83.0',
  license: 'MIT-0',
  author: 'Court Schuett',
  copyrightOwner: 'Amazon.com, Inc.',
  authorAddress: 'https://aws.amazon.com',
  appEntrypoint: 'ec2-instance.ts',
  name: 'ec2-instance',
  eslintOptions: { ignorePatterns: ['resources/**'] },
  devDeps: ['esbuild'],
  defaultReleaseBranch: 'master',
  deps: ['dotenv'],
});

const common_exclude = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
  '.DS_Store',
];
project.addTask('launch', {
  exec: 'yarn && yarn projen && yarn build && yarn cdk bootstrap && yarn cdk deploy --require-approval never',
});
project.gitignore.exclude(...common_exclude);
project.synth();
