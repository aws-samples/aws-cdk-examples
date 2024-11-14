import { config } from '../utils';

const app = 's3SnsLambda';
const { accountId } = config.aws;

export const ResourcePrefix = `${app}-${config.nodeEnv}-${accountId}`;
