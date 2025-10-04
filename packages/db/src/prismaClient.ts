import { PrismaClient, type Prisma } from '@prisma/client';

export type DatabaseConfig = {
  datasourceUrl?: string;
  logQueries?: boolean;
  prismaOptions?: Omit<Prisma.PrismaClientOptions, 'datasources' | 'log'>;
};

/**
 * createPrismaClient centralizes the options we use across services so migrations/tests
 * can share defaults (strict error mode, optional query logging, custom datasource URL).
 */
export function createPrismaClient(config: DatabaseConfig = {}) {
  const { datasourceUrl, logQueries = false, prismaOptions } = config;
  return new PrismaClient({
    ...prismaOptions,
    log: logQueries ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    datasources: datasourceUrl
      ? {
          db: {
            url: datasourceUrl,
          },
        }
      : undefined,
  });
}

export type PrismaTransaction = Parameters<PrismaClient['$transaction']>[0];
