import { App } from 'aws-cdk-lib';
import { Match, Template } from '@aws-cdk/assertions';
import { CoreInfrastructureStack } from '../src/core-infrastructure-stack';
import { environments } from '../src/config/environments';

describe('CoreInfrastructureStack', () => {
  const app = new App();
  const env = environments.dev;
  const stack = new CoreInfrastructureStack(app, 'TestStack', {
    env: { account: env.account, region: env.region },
    envConfig: env,
  });
  const template = Template.fromStack(stack);

  it('provisions versioned KMS encrypted buckets', () => {
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'aws:kms',
            }),
          }),
        ]),
      },
    });
  });

  it('configures serverless v2 Aurora cluster with customer-managed key', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      ServerlessV2ScalingConfiguration: Match.objectLike({
        MinCapacity: env.auroraCapacity.minCapacity,
        MaxCapacity: env.auroraCapacity.maxCapacity,
      }),
      StorageEncrypted: true,
      KmsKeyId: Match.anyValue(),
    });
  });

  it('defines ingestion queue with DLQ protection', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 300,
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      RedrivePolicy: Match.objectLike({
        maxReceiveCount: 5,
      }),
    });
  });

  it('creates express step function stub with logging', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineType: 'EXPRESS',
      LoggingConfiguration: Match.objectLike({
        Level: 'ALL',
      }),
    });
  });

  it('provisions baseline IAM roles for lambdas and workflows', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: Match.objectLike({
              Service: Match.arrayWith(['lambda.amazonaws.com']),
            }),
          }),
        ]),
      }),
    });
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: Match.objectLike({
              Service: Match.arrayWith(['states.amazonaws.com']),
            }),
          }),
        ]),
      }),
    });
  });
});
