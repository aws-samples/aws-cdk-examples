from common import EnvSettings
import aws_cdk as cdk


class CDKEnvBuilder:
    ALLOWED_STACKS = ['crossaccount-role', 'upstream-pipeline', 'downstream-pipeline', 'codeartifact']

    @staticmethod
    def find_env(stack: str):
        if stack == 'crossaccount-role':
            env = cdk.Environment(
                account=EnvSettings.APP_ACCOUNT,
                region=EnvSettings.REGION_MAIN
            )
        elif stack == 'upstream-pipeline':
            env = cdk.Environment(
                account=EnvSettings.ACCOUNT,
                region=EnvSettings.REGION_MAIN
            )
        elif stack == 'downstream-pipeline':
            env = cdk.Environment(
                account=EnvSettings.ACCOUNT,
                region=EnvSettings.REGION_MAIN
            )
        elif stack == 'codeartifact':
            env = cdk.Environment(
                account=EnvSettings.ACCOUNT,
                region=EnvSettings.REGION_ARTIFACTS
            )
        else:
            raise ValueError(
                f"Error Unknown stack name {stack} passed, allowed names are \
                    {CDKEnvBuilder.ALLOWED_STACKS}"
            )
        return env

