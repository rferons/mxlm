# Infrastructure CDK Workspace

This package contains the AWS CDK stacks that provision the Maintenance LogbookLM baseline (KMS key, S3 buckets, SQS queues, Aurora Serverless v2 cluster, Step Functions skeleton, and IAM roles).

## Prerequisites

- Node.js 20.x and `pnpm@10.18.0` (activate with Corepack)
- AWS CLI configured with the target account credentials (`AWS_PROFILE`, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, or SSO)
- Bootstrapped CDK environment in the destination account/region (`cdk bootstrap`)

## Install dependencies

From the repository root run:

```bash
pnpm install
```

This installs dependencies for every workspace including `@mxlm/infrastructure`.

## Run unit tests

Execute the Vitest assertion suite:

```bash
pnpm --filter @mxlm/infrastructure test
```

The tests validate encryption, scaling limits, queue wiring, and IAM grants defined in the CDK stack.

## Synthesize the CloudFormation templates

To produce a local CloudFormation template snapshot without deploying resources:

```bash
pnpm --filter @mxlm/infrastructure cdk synth -- --context env=<environment>
```

If you omit `--context env=<environment>` the stack defaults to the `dev` configuration declared in [`src/config/environments.ts`](cdk/src/config/environments.ts).

## Deploy to AWS

1. Ensure the destination account/region exists in [`environments.ts`](cdk/src/config/environments.ts). Add an entry if necessary.
2. Bootstrap the target environment once per account/region pair:

   ```bash
   pnpm --filter @mxlm/infrastructure cdk bootstrap -- --context env=<environment>
   ```

3. Deploy the stack:

   ```bash
   pnpm --filter @mxlm/infrastructure cdk deploy -- --context env=<environment>
   ```

Pass `--profile <name>` or use standard AWS CLI environment variables if you manage multiple accounts.

## Cleaning up

To remove the provisioned resources (irreversible, data will be deleted):

```bash
pnpm --filter @mxlm/infrastructure cdk destroy -- --context env=<environment>
```

Confirm the prompts to complete deletion.
