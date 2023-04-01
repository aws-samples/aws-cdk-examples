const {
  CodeBuildClient,
  StartBuildCommand,
} = require("@aws-sdk/client-codebuild");

exports.handler = async (event) => {
  const REGION = "us-east-1";

  const codebuild = new CodeBuildClient({ region: REGION });

  const buildProjectName = process.env.CODEBUILD_PROJECT_NAME;
  console.log(buildProjectName);

  const buildCommand = new StartBuildCommand({ projectName: buildProjectName });
  console.log("Triggering CodeBuild Project...");
  const buildResponse = await codebuild.send(buildCommand);
  console.log(buildResponse);

  const response = {
    statusCode: 200,
    body: "CodeBuild Project building...",
  };
  return response;
};
