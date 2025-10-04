import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const packageRoot = dirname(fileURLToPath(new URL('..', import.meta.url)));
const composedSchemaPath = join('prisma', '.generated', 'schema.prisma');

export interface MigrationOptions {
  databaseUrl: string;
  skipGenerate?: boolean;
}

async function runCompose() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['run', 'compose'], {
      cwd: packageRoot,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pnpm run compose exited with code ${code}`));
      }
    });
  });
}

async function runPrismaCommand(args: string[], databaseUrl: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'prisma', ...args, '--schema', composedSchemaPath],
      {
        cwd: packageRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`prisma ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

export async function applyMigrations({ databaseUrl, skipGenerate }: MigrationOptions) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply migrations.');
  }

  await runCompose();

  if (!skipGenerate) {
    await runPrismaCommand(['generate'], databaseUrl);
  }

  await runPrismaCommand(['migrate', 'deploy'], databaseUrl);
}
