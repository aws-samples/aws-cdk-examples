export interface IamPolicyRoleConfig {
    policies?: (PoliciesEntity)[] | null;
    roles?: (RolesEntity)[] | null;
  }
  export interface PoliciesEntity {
    policy_name: string;
    description: string;
    policy_file: string;
  }
  export interface RolesEntity {
    role_name: string;
    trust_service_principal: (string)[] | null;
    trust_account_principal: (string)[] | null 
    customer_managed_policies?: (string)[] | null;
    aws_managed_policies?: (string)[] | null;
  }

  export interface IamPolicyDocument {
    Version: string;
    Statement?: (StatementEntity)[] | null;
  }
  export interface StatementEntity {
    Action?: (string)[] | null | string;
    Effect: string;
    Resource: string;
    Condition?: Condition | null;
  }
  export interface Condition {
    operator: Operator;
  }
  export interface Operator {
    key: string;
  }