import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import { CleanupPricesJob } from './cleanup-prices.job';

interface PriceJobsStackProps extends cdk.NestedStackProps {
  vpc: ec2.IVpc;
  securityGroups: ec2.ISecurityGroup[];
}

export class PriceJobsStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: PriceJobsStackProps) {
    super(scope, id, props);

    new CleanupPricesJob(this, 'CleanupPricesJob', props);
  }
}
