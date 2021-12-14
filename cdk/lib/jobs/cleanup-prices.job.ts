import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import { getSecretsValue } from '../utils/secrets';

interface CleanupPricesJobProps {
  vpc: ec2.IVpc;
  securityGroups: ec2.ISecurityGroup[];
}

export class CleanupPricesJob extends Construct {
  lambdaRole: iam.Role;
  lambda: lambda.Function;
  eventRule: events.Rule;

  constructor(scope: Construct, id: string, env: CleanupPricesJobProps) {
    super(scope, id);

    this.lambdaRole = new iam.Role(this, 'CleanupPricesLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        new iam.ManagedPolicy(this, 'CleanupPricesLambdaPolicy', {
          document: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ec2:DescribeNetworkInterfaces',
                  'ec2:CreateNetworkInterface',
                  'ec2:DeleteNetworkInterface',
                  'ec2:DescribeInstances',
                  'ec2:AttachNetworkInterface',
                ],
                resources: ['*'],
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['logs:*'],
                resources: ['*'],
              }),
            ],
          }),
        }),
      ],
    });

    this.lambda = new lambda.Function(this, 'CleanupPricesLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('../jobs/lambda_prices_cleanup/output/lambda.zip'),
      handler: 'lambda.handler',
      timeout: cdk.Duration.minutes(15),
      reservedConcurrentExecutions: 1,
      memorySize: 256,
      role: this.lambdaRole,
      vpc: env.vpc,
      securityGroups: env.securityGroups,
      environment: {
        DB_HOST: getSecretsValue(this, 'DbHost', 'defiyield/development/database', 'DB_HOST'),
        DB_PORT: getSecretsValue(this, 'DbPort', 'defiyield/development/database', 'DB_PORT'),
        DB_DATABASE: getSecretsValue(
          this,
          'DbName',
          'defiyield/development/database',
          'DB_DATABASE',
        ),
        DB_USERNAME: getSecretsValue(
          this,
          'DbUser',
          'defiyield/development/database',
          'DB_USERNAME',
        ),
        DB_PASSWORD: getSecretsValue(
          this,
          'DbPass',
          'defiyield/development/database',
          'DB_PASSWORD',
        ),
      },
    });

    this.eventRule = new events.Rule(this, 'CleanupPricesLambdaRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '3' }),
    });

    this.eventRule.addTarget(
      new targets.LambdaFunction(this.lambda, {
        event: events.RuleTargetInput.fromObject({}),
      }),
    );

    targets.addLambdaPermission(this.eventRule, this.lambda);
  }
}
