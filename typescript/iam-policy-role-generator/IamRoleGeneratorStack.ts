import cdk = require('@aws-cdk/core');
import fs = require("fs");
import { IamPolicyRoleConfig, RolesEntity } from './IPolicyRoleConfig';
import { ManagedPolicy, Role, ServicePrincipal, AccountPrincipal, CompositePrincipal } from '@aws-cdk/aws-iam';


export class IamRoleGeneratorStack extends cdk.Stack {


  constructor(app: cdk.App, id: string) {
    super(app, id);
    let configjson: IamPolicyRoleConfig = JSON.parse(fs.readFileSync('config/iam_generator_config.json').toString());
    let roles: RolesEntity[] = configjson.roles as RolesEntity[];
    let trust_service_principal: string[];
    let trust_account_principal: string[];
    let customer_managed_policies: string[];
    let aws_managed_policies: string[];
    let compositePrincipal;
    let role;

    for (var i = 0; i < roles.length; i++) {
      compositePrincipal = null;
      trust_service_principal = roles[i].trust_service_principal as string[]
      trust_account_principal = roles[i].trust_account_principal as string[]
      customer_managed_policies = roles[i].customer_managed_policies as string[];
      aws_managed_policies = roles[i].aws_managed_policies as string[];



      if (trust_service_principal != null) {
        for (var k = 0; k < trust_service_principal.length; k++) {
          if (compositePrincipal == null) {
            compositePrincipal = new CompositePrincipal(new ServicePrincipal(trust_service_principal[k]))
          } else {
            compositePrincipal.addPrincipals(new ServicePrincipal(trust_service_principal[k]))
          }
        }
      }

      if (trust_account_principal != null) {
        for (var k = 0; k < trust_account_principal.length; k++) {
          if (compositePrincipal == null) {
            compositePrincipal = new CompositePrincipal(new AccountPrincipal(trust_account_principal[k]))
          } else {
            compositePrincipal.addPrincipals(new AccountPrincipal(trust_account_principal[k]))
          }
        }
      }

      if (compositePrincipal != null) {
        role = new Role(this, roles[i].role_name, {
          roleName: roles[i].role_name,
          assumedBy: compositePrincipal
        });

        if (customer_managed_policies != null) {
          for (var j = 0; j < customer_managed_policies.length; j++) {
            role.addManagedPolicy(ManagedPolicy.fromManagedPolicyName(this, roles[i].role_name + customer_managed_policies[j], customer_managed_policies[j]))
          }
        }

        if (aws_managed_policies != null) {
          for (var j = 0; j < aws_managed_policies.length; j++) {
            role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(aws_managed_policies[j]))
          }
        }

      }
    }
  }
}