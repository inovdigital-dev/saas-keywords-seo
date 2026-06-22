// Reproduces the real-world bug: a stale user row holds an email under an old id,
// then the same person logs in with a new Supabase UUID. Must NOT crash.
import { prisma } from '../lib/prisma'

const OLD_ID = 'cmstaleoldcuid000000test' // simulates pre-migration cuid row
const NEW_UUID = '11111111-2222-3333-4444-555555555555'
const EMAIL = 'conflict-test@wppcommerce.local'

// Mirror of ensureUser() in app/api/jobs/route.ts
async function ensureUser(userId: string, email?: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (existing) return existing
  try {
    return await prisma.user.create({ data: { id: userId, email: email ?? `${userId}@users.local` } })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return await prisma.user.create({ data: { id: userId, email: `${userId}@users.local` } })
    }
    throw e
  }
}

async function main() {
  console.log('Setup: create a STALE row (old id + email)...')
  await prisma.user.deleteMany({ where: { email: EMAIL } })
  await prisma.user.deleteMany({ where: { id: NEW_UUID } })
  await prisma.user.create({ data: { id: OLD_ID, email: EMAIL } })
  console.log('   ✓ Stale row created')

  console.log('Test: same person logs in with NEW UUID + same email (the crash scenario)...')
  const user = await ensureUser(NEW_UUID, EMAIL)
  console.log(`   ✓ ensureUser did NOT crash → id=${user.id} email=${user.email}`)

  console.log('Test: create a job for this user...')
  const job = await prisma.job.create({
    data: { userId: NEW_UUID, status: 'PENDING', results: { create: [{ url: 'https://example.com', status: 'PENDING' }] } },
  })
  console.log(`   ✓ Job created: ${job.id}`)

  console.log('Cleanup...')
  await prisma.job.delete({ where: { id: job.id } })
  await prisma.user.deleteMany({ where: { id: { in: [OLD_ID, NEW_UUID] } } })
  console.log('   ✓ Done')

  console.log('\n✓✓✓ EMAIL-CONFLICT SCENARIO HANDLED GRACEFULLY')
  await prisma.$disconnect()
}
main().catch(async e => { console.error('✗ TEST FAILED:', e); await prisma.$disconnect(); process.exit(1) })
