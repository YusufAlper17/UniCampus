import { eq } from 'drizzle-orm';
import { db, schema } from './index.js';
import { hashPassword } from '../lib/password.js';
import { emailHash, encryptEmail } from '../lib/email-crypto.js';

// Pilot üniversiteler + edu domain whitelist.
const SEED_UNIVERSITIES = [
  {
    name: 'İstanbul Teknik Üniversitesi',
    shortName: 'İTÜ',
    city: 'İstanbul',
    domains: ['itu.edu.tr'],
  },
  {
    name: 'Orta Doğu Teknik Üniversitesi',
    shortName: 'ODTÜ',
    city: 'Ankara',
    domains: ['metu.edu.tr', 'std.metu.edu.tr'],
  },
  {
    name: 'Boğaziçi Üniversitesi',
    shortName: 'BOUN',
    city: 'İstanbul',
    domains: ['boun.edu.tr', 'std.bogazici.edu.tr'],
  },
];

async function seedAdmin() {
  // İlk üniversiteyi admin'e bağla; varsa atla (idempotent).
  const [firstUni] = await db.select().from(schema.universities).limit(1);
  if (!firstUni) return;

  const adminEmail = 'admin@itu.edu.tr';
  const eHash = emailHash(adminEmail);
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.emailHash, eHash))
    .limit(1);
  if (existing) {
    console.log('  · admin zaten mevcut');
    return;
  }
  await db.insert(schema.users).values({
    universityId: firstUni.id,
    type: 'super_admin',
    status: 'active',
    username: 'admin',
    displayName: 'Platform Admin',
    emailEnc: encryptEmail(adminEmail),
    emailHash: eHash,
    passwordHash: hashPassword('Admin123!'),
    isVerifiedStudent: true,
  });
  console.log('  + admin (admin@itu.edu.tr / Admin123!)');
}

async function main() {
  console.log('Seed başlıyor...');
  const existingUnis = await db.select({ id: schema.universities.id }).from(schema.universities).limit(1);
  if (existingUnis.length === 0) {
    for (const uni of SEED_UNIVERSITIES) {
      const [inserted] = await db
        .insert(schema.universities)
        .values({ name: uni.name, shortName: uni.shortName, city: uni.city })
        .returning();
      if (!inserted) continue;
      for (const domain of uni.domains) {
        await db
          .insert(schema.universityDomains)
          .values({ universityId: inserted.id, domain })
          .onConflictDoNothing();
      }
      console.log(`  + ${uni.shortName} (${uni.domains.join(', ')})`);
    }
  } else {
    console.log('  · üniversiteler zaten mevcut');
  }
  await seedAdmin();
  console.log('Seed tamamlandı.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed hatası:', err);
  process.exit(1);
});
