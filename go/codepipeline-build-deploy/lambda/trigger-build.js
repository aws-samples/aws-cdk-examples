const {
  CodeBuildClient,
  StartBuildCommand,
} = require("@aws-sdk/client-codebuild");

exports.handler = async (event) => {
  const region = process.env.REGION;
  const buildProjectName = process.env.CODEBUILD_PROJECT_NAME;

  const codebuild = new CodeBuildClient({ region: region });
  const buildCommand = new StartBuildCommand({ projectName: buildProjectName });

  console.log("Triggering CodeBuild Project...");
  const buildResponse = await codebuild.send(buildCommand);
  console.log(buildResponse);

  return {
    statusCode: 200,
    body: "CodeBuild Project building...",
  };
};
