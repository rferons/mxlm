import { App } from 'aws-cdk-lib';

export interface EnvironmentSettings {
  readonly name: string;
  readonly account: string;
  readonly region: string;
  readonly auroraCapacity: {
    readonly minCapacity: number;
    readonly maxCapacity: number;
  };
}

export const environments: Record<string, EnvironmentSettings> = {
  dev: {
    name: 'dev',
    account: '111111111111',
    region: 'us-east-1',
    auroraCapacity: {
      minCapacity: 0.5,
      maxCapacity: 4,
    },
  },
};

export const DEFAULT_ENVIRONMENT = 'dev';

export function resolveEnvironment(app: App): EnvironmentSettings {
  const contextName =
    (app.node.tryGetContext('env') as string | undefined) ?? process.env.CDK_ENV;
  const environmentName = contextName ?? DEFAULT_ENVIRONMENT;
  const config = environments[environmentName];

  if (!config) {
    const available = Object.keys(environments).join(', ');
    throw new Error(
      `Unknown environment "${environmentName}". Available environments: ${available || 'none'}.`,
    );
  }

  return config;
}
