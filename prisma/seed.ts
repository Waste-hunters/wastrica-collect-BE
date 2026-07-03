import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = "postgresql://postgres:121402pr0732021@localhost:5432/wastrica_collect_db?schema=public";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('Seeding database...');

  // Create test companies
  const company1 = await prisma.company.upsert({
    where: { ruraLicenseNumber: 'RURA-WST-001' },
    update: {},
    create: {
      name: 'Wastrica Cleaners Ltd',
      ruraLicenseNumber: 'RURA-WST-001',
      contactPhone: '0788111222',
      contactEmail: 'contact@wastrica.rw',
      lateFeeGraceDays: 5,
      lateFeeType: 'FLAT',
      lateFeeAmountRwf: 500,
    },
  });
  console.log('Created company:', company1.name);

  const company2 = await prisma.company.upsert({
    where: { ruraLicenseNumber: 'RURA-WST-002' },
    update: {},
    create: {
      name: 'Kigali Waste Hunters',
      ruraLicenseNumber: 'RURA-WST-002',
      contactPhone: '0788333444',
      contactEmail: 'info@kigaliwaste.rw',
      lateFeeGraceDays: 10,
      lateFeeType: 'PERCENTAGE',
      lateFeeAmountRwf: 10,
    },
  });
  console.log('Created company:', company2.name);

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
