import {
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_kms as kms,
  aws_logs as logs,
  aws_rds as rds,
  aws_s3 as s3,
  aws_sqs as sqs,
  aws_stepfunctions as sfn,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentSettings } from './config/environments';

export interface CoreInfrastructureStackProps extends StackProps {
  readonly envConfig: EnvironmentSettings;
}

export class CoreInfrastructureStack extends Stack {
  public readonly dataKey: kms.Key;
  public readonly documentsBucket: s3.Bucket;
  public readonly artifactsBucket: s3.Bucket;
  public readonly ingestionQueue: sqs.Queue;
  public readonly auroraCluster: rds.DatabaseCluster;
  public readonly ingestionStateMachine: sfn.StateMachine;
  public readonly ingestionLambdaRole: iam.Role;
  public readonly workflowRole: iam.Role;

  public constructor(scope: Construct, id: string, props: CoreInfrastructureStackProps) {
    super(scope, id, {
      description:
        'Core infrastructure for GA Maintenance LogbookLM: buckets, queues, Aurora, Step Functions, and IAM roles.',
      env: props.env,
      stackName: id,
      tags: { Environment: props.envConfig.name },
    });

    this.dataKey = new kms.Key(this, 'PrimaryDataKey', {
      alias: `alias/logbooklm/${props.envConfig.name}/primary`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.documentsBucket = this.createEncryptedBucket('DocumentsBucket');
    this.artifactsBucket = this.createEncryptedBucket('ArtifactsBucket', {
      lifecycleRules: [
        {
          id: 'expire-noncurrent-artifacts',
          noncurrentVersionExpiration: Duration.days(30),
        },
      ],
    });

    const deadLetterQueue = new sqs.Queue(this, 'IngestionDeadLetterQueue', {
      queueName: `logbooklm-${props.envConfig.name}-ingestion-dlq`,
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: this.dataKey,
    });

    this.ingestionQueue = new sqs.Queue(this, 'IngestionQueue', {
      queueName: `logbooklm-${props.envConfig.name}-ingestion`,
      visibilityTimeout: Duration.minutes(5),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 5,
      },
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: this.dataKey,
    });

    const vpc = new ec2.Vpc(this, 'ApplicationVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Restrict Aurora access to application workloads.',
      allowAllOutbound: true,
    });

    this.auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier: `logbooklm-${props.envConfig.name}-aurora`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      instances: 1,
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        allowMajorVersionUpgrade: false,
        enablePerformanceInsights: true,
      }),
      serverlessV2MinCapacity: props.envConfig.auroraCapacity.minCapacity,
      serverlessV2MaxCapacity: props.envConfig.auroraCapacity.maxCapacity,
      vpc,
      defaultDatabaseName: 'logbooklm',
      securityGroups: [dbSecurityGroup],
      storageEncrypted: true,
      storageEncryptionKey: this.dataKey,
      removalPolicy: RemovalPolicy.DESTROY,
      backup: {
        retention: Duration.days(7),
      },
    });

    const workflowLogGroup = new logs.LogGroup(this, 'IngestionWorkflowLogs', {
      logGroupName: `/aws/vendedlogs/states/logbooklm/${props.envConfig.name}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const workflowDefinition = new sfn.Chain().start(
      new sfn.Pass(this, 'StartIngestion', {
        comment: 'Placeholder state until service Lambdas are implemented.',
      }),
    );

    this.workflowRole = new iam.Role(this, 'WorkflowExecutionRole', {
      roleName: `logbooklm-${props.envConfig.name}-workflow`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: 'Base execution role for Step Functions ingestion workflow.',
    });
    this.documentsBucket.grantReadWrite(this.workflowRole);
    this.artifactsBucket.grantReadWrite(this.workflowRole);
    this.dataKey.grantEncryptDecrypt(this.workflowRole);

    this.ingestionStateMachine = new sfn.StateMachine(this, 'IngestionWorkflow', {
      stateMachineName: `logbooklm-${props.envConfig.name}-ingestion`,
      definitionBody: sfn.DefinitionBody.fromChainable(workflowDefinition),
      stateMachineType: sfn.StateMachineType.EXPRESS,
      role: this.workflowRole,
      logs: {
        destination: workflowLogGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    this.ingestionLambdaRole = new iam.Role(this, 'IngestionLambdaRole', {
      roleName: `logbooklm-${props.envConfig.name}-ingestion-lambda`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Shared execution role for ingestion Lambdas.',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    this.documentsBucket.grantReadWrite(this.ingestionLambdaRole);
    this.artifactsBucket.grantReadWrite(this.ingestionLambdaRole);
    this.ingestionQueue.grantSendMessages(this.ingestionLambdaRole);
    this.dataKey.grantEncryptDecrypt(this.ingestionLambdaRole);
    this.ingestionStateMachine.grantStartExecution(this.ingestionLambdaRole);
  }

  private createEncryptedBucket(id: string, options?: s3.BucketProps): s3.Bucket {
    return new s3.Bucket(this, id, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.dataKey,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      ...options,
    });
  }
}
