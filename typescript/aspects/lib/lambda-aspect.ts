/**
 * This module shows an example implementation of an aspect.
 * 
 * For this example, we will create an aspect that sets a default reservedConcurrentExecutions value for any lambda in the target scope.
 * This aspect is useful for applying customizations to high-level constructs, which may not provide such customization via typescript.
 */

import { IConstruct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
    aws_lambda as lambda
} from 'aws-cdk-lib';

//1. Create a class that implements the cdk.IAspect interface
export class DefaultReservedConcurrentExecutions implements cdk.IAspect {

    //2. Pass any parameters you want to use into the constructor, or skip to step 3 if N/A.
    constructor(protected reservedConcurrentExecutions: number){}

    //3. Implement the visit method
    //This method will run for every node in the scope that the aspect is applied to.
    //Run "cdk list" and view the logs to see its behavior
    visit(node: IConstruct): void {
        //4. Apply customizations here
        const nodePath = node.node.path;
        console.log('Visiting node', nodePath)
        if(node instanceof cdk.CfnResource && node.cfnResourceType === 'AWS::Lambda::Function'){
            const cfnFunction = node as lambda.CfnFunction;
            if(cfnFunction.reservedConcurrentExecutions === undefined){
                console.log('\tSetting default lambda reservedConcurrentExecutions to', this.reservedConcurrentExecutions);
                node.addPropertyOverride('ReservedConcurrentExecutions', this.reservedConcurrentExecutions);
            } else {
                console.log('\tLambda already has', cfnFunction.reservedConcurrentExecutions, 'reservedConcurrentExecutions.');
            }
        } else {
            console.log('\tNode is not a lambda function.')
        }
    }
}
