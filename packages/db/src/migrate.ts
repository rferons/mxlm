import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const packageRoot = dirname(fileURLToPath(new URL('..', import.meta.url)));
const composedSchemaPath = join('prisma', '.generated', 'schema.prisma');
const originalSchemaPath = join('prisma', 'schema.prisma');

export interface MigrationOptions {
  databaseUrl: string;
  skipGenerate?: boolean;
}

async function runCompose() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['--filter', '@mxlm/db', 'run', 'compose'], {
      cwd: join(packageRoot, '..', '..'), // Go to project root
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

async function runPrismaCommand(args: string[], databaseUrl: string, useOriginalSchema = false) {
  await new Promise<void>((resolve, reject) => {
    const schemaPath = useOriginalSchema ? originalSchemaPath : composedSchemaPath;
    const child = spawn(
      'pnpm',
      ['--filter', '@mxlm/db', 'exec', 'prisma', ...args, '--schema', schemaPath],
      {
        cwd: packageRoot, // Use the package root for migrations
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

export async function applyMigrations({ databaseUrl }: MigrationOptions) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply migrations.');
  }

  await runCompose();

  // Create a symlink to the migrations directory in the .generated folder
  const migrationsDir = join(packageRoot, 'db', 'prisma', 'migrations');
  const generatedMigrationsDir = join(packageRoot, 'db', 'prisma', '.generated', 'migrations');
  
  
  try {
    // Remove existing symlink if it exists
    await import('fs').then(fs => fs.promises.unlink(generatedMigrationsDir).catch(() => {
      // Ignore errors when removing non-existent symlink
    }));
    // Create symlink to migrations directory
    await import('fs').then(fs => fs.promises.symlink(migrationsDir, generatedMigrationsDir, 'dir'));
  } catch {
    // If symlink fails, copy the migrations directory
    await import('fs').then(fs => fs.promises.cp(migrationsDir, generatedMigrationsDir, { recursive: true }));
  }

  // Use the composed schema for migrations
  await runPrismaCommand(['migrate', 'deploy'], databaseUrl);

  // Always generate the client to ensure it's available
  await runPrismaCommand(['generate'], databaseUrl);
}
