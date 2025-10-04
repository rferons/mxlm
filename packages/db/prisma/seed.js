import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const fixturePath = join(__dirname, 'fixtures', 'default-seed.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));

  const org = await client.organization.upsert({
    where: { slug: fixture.organization.slug },
    update: {},
    create: fixture.organization,
  });

  for (const user of fixture.users) {
    await client.user.upsert({
      where: {
        orgId_email: {
          orgId: org.id,
          email: user.email,
        },
      },
      update: {},
      create: {
        ...user,
        orgId: org.id,
      },
    });
  }

  for (const aircraft of fixture.aircraft) {
    await client.aircraft.upsert({
      where: {
        orgId_tailNumber: {
          orgId: org.id,
          tailNumber: aircraft.tailNumber,
        },
      },
      update: {},
      create: {
        ...aircraft,
        orgId: org.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.$disconnect();
  });
