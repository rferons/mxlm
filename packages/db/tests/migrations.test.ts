import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Prisma } from '@prisma/client';
import { applyMigrations, createPrismaClient } from '../src/index.js';

async function dockerIsAvailable() {
  try {
    await new Promise<void>((resolve, reject) => {
      execFile('docker', ['info'], (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    return true;
  } catch {
    return false;
  }
}

const describeIfDocker = (await dockerIsAvailable()) ? describe : describe.skip;

describeIfDocker('database migrations', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('mxlm')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    databaseUrl = container.getConnectionUri();
    await applyMigrations({ databaseUrl });
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('persists maintenance events, directives, embeddings, and audit rows', async () => {
    const prisma = createPrismaClient({ 
      datasourceUrl: databaseUrl,
      prismaOptions: { log: ['error'] }
    });

    const orgId = randomUUID();
    const ownerId = randomUUID();
    const mechanicId = randomUUID();
    const aircraftId = randomUUID();
    const engineId = randomUUID();
    const directiveId = randomUUID();
    const eventId = randomUUID();
    const auditId = randomUUID();

    await prisma.organization.create({
      data: {
        id: orgId,
        name: 'SkyShare Aviation',
        slug: 'skyshare',
        timezone: 'America/Denver',
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: ownerId,
          orgId,
          email: 'owner@skyshare.aero',
          displayName: 'Owner Pilot',
          role: 'OWNER',
          status: 'ACTIVE',
        },
        {
          id: mechanicId,
          orgId,
          email: 'ia@skyshare.aero',
          displayName: 'Inspection Authority',
          role: 'MECHANIC',
          status: 'ACTIVE',
        },
      ],
    });

    await prisma.aircraft.create({
      data: {
        id: aircraftId,
        orgId,
        tailNumber: 'N9876Q',
        make: 'Piper',
        model: 'PA-46',
        serialNumber: 'PA46-001',
        year: 2014,
      },
    });

    const component = await prisma.component.create({
      data: {
        id: engineId,
        orgId,
        aircraftId,
        name: 'Left Engine',
        type: 'ENGINE',
        serialNumber: 'LIO-540-001',
        manufacturer: 'Lycoming',
        model: 'IO-540',
      },
    });

    const signatory = await prisma.signatory.create({
      data: {
        orgId,
        fullName: 'Jordan Wrench',
        credentialType: 'IA',
        certificateId: '123456789',
        email: 'jordan@example.com',
      },
    });

    const directive = await prisma.directive.create({
      data: {
        id: directiveId,
        orgId,
        directiveType: 'AIRWORTHINESS_DIRECTIVE',
        referenceCode: 'AD 2024-01-01',
        title: 'Example AD for testing',
        applicability: { aircraft: ['PA-46'], engines: ['IO-540'] },
      },
    });

    const event = await prisma.maintenanceEvent.create({
      data: {
        id: eventId,
        orgId,
        aircraftId,
        componentId: component.id,
        signatoryId: signatory.id,
        eventType: 'AD_COMPLIANCE',
        origin: 'MANUAL',
        performedAt: new Date('2024-10-01T12:00:00Z'),
        description: 'Complied with AD 2024-01-01',
        correctiveAction: 'Inspected and replaced parts per AD',
        tachHours: new Prisma.Decimal(1234.5),
        hobbsHours: new Prisma.Decimal(1200.3),
      },
    });

    await prisma.maintenanceEventDirective.create({
      data: {
        eventId: event.id,
        directiveId: directive.id,
        complianceStatus: 'COMPLIED',
        notes: 'Verified by IA',
      },
    });

    const snapshot = await prisma.complianceSnapshot.create({
      data: {
        orgId,
        aircraftId,
        asOf: new Date('2024-10-02T00:00:00Z'),
        summary: {
          overdue: [],
          complied: ['AD 2024-01-01'],
        },
      },
    });

    await prisma.embedding.createMany({
      data: [
        {
          orgId,
          scope: 'MAINTENANCE_EVENT',
          targetEventId: event.id,
          dimensions: 4,
          vector: [0.1, 0.2, 0.3, 0.4],
        },
        {
          orgId,
          scope: 'COMPLIANCE_SNAPSHOT',
          targetComplianceSnapshotId: snapshot.id,
          dimensions: 4,
          vector: [0.05, 0.1, 0.15, 0.2],
        },
      ],
    });

    await prisma.dueItem.create({
      data: {
        orgId,
        aircraftId,
        componentId: component.id,
        directiveId: directive.id,
        eventType: 'INSPECTION',
        title: 'Next annual due',
        dueAt: new Date('2025-10-01T00:00:00Z'),
      },
    });

    await prisma.auditLog.create({
      data: {
        id: auditId,
        orgId,
        actorId: ownerId,
        actorType: 'USER',
        entityType: 'MAINTENANCE_EVENT',
        entityId: event.id,
        action: 'CREATED',
        summary: 'Owner captured manual AD compliance event',
        before: null,
        after: { eventId: event.id },
      },
    });

    const linkedEvent = await prisma.maintenanceEvent.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        directives: true,
        component: true,
        signatory: true,
      },
    });

    expect(linkedEvent.directives).toHaveLength(1);
    expect(linkedEvent.component?.serialNumber).toBe('LIO-540-001');
    expect(linkedEvent.signatory?.fullName).toBe('Jordan Wrench');

    await expect(
      prisma.aircraft.create({
        data: {
          id: randomUUID(),
          orgId,
          tailNumber: 'N9876Q',
          make: 'Duplicate',
          model: 'Duplicate',
        },
      }),
    ).rejects.toThrow();

    const embeddings = await prisma.embedding.findMany({ where: { orgId } });
    expect(embeddings).toHaveLength(2);

    const audit = await prisma.auditLog.findUniqueOrThrow({ where: { id: auditId } });
    expect(audit.entityType).toBe('MAINTENANCE_EVENT');

    await prisma.$disconnect();
  });
});
