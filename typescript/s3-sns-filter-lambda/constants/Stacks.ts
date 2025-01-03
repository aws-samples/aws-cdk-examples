import { ResourcePrefix } from './constants';

export const Stacks = {
  LambdaStack: `${ResourcePrefix}-lambda-stack`,
  RoleStack: `${ResourcePrefix}-role-stack`,
  StorageStack: `${ResourcePrefix}-storage-stack`,
  SnsStack: `${ResourcePrefix}-sns-stack`
};
