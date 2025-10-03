#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CoreInfrastructureStack } from '../src/core-infrastructure-stack';
import { resolveEnvironment } from '../src/config/environments';

const app = new App();
const environment = resolveEnvironment(app);

new CoreInfrastructureStack(app, `LogbookLM-${environment.name}`, {
  env: { account: environment.account, region: environment.region },
  envConfig: environment,
});

app.synth();
