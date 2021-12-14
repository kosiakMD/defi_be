import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export function getSecretsValue(scope: Construct, id: string, name: string, key: string) {
  return secretsManager.Secret.fromSecretNameV2(scope, id, name)
    .secretValueFromJson(key)
    .toString();
}
