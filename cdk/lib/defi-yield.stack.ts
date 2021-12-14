import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import { PriceJobsStack } from './jobs/price-jobs.stack';

export class DefiYieldStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: 'vpc-089f076230addcecb',
    });

    const securityGroups = [
      ec2.SecurityGroup.fromSecurityGroupId(this, 'SecurityGroupDefault', 'sg-0f57652adb263a825'),
      ec2.SecurityGroup.fromSecurityGroupId(this, 'SecurityGroupWorkers', 'sg-09ea3f472cbeb0368'),
      ec2.SecurityGroup.fromSecurityGroupId(this, 'SecurityGroupCluster', 'sg-0608fdd3c73d7204c'),
      ec2.SecurityGroup.fromSecurityGroupId(this, 'SecurityGroupGateway', 'sg-0dfd945823247512c'),
    ];

    new PriceJobsStack(this, 'PriceJobsStack', {
      vpc,
      securityGroups,
    });
  }
}
