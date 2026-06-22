// Full end-to-end test AGAINST THE REAL DATABASE.
// Simulates: user sync → job creation → processing → reading results back.
import { prisma } from '../lib/prisma'
import { processJob } from '../lib/process'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001' // fake Supabase UUID
const TEST_EMAIL = 'pipeline-test@wppcommerce.local'
const TEST_URLS = [
  'https://www.auchan.pt/pt/alimentacao/produtos-lacteos/iogurtes/',
  'https://www.adidas.pt/casacos-mulher', // expected to FAIL cleanly
]

async function main() {
  console.log('1. Connecting to DB and upserting user...')
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: { email: TEST_EMAIL },
    create: { id: TEST_USER_ID, email: TEST_EMAIL },
  })
  console.log('   ✓ User OK')

  console.log('2. Creating job with 2 URLs...')
  const job = await prisma.job.create({
    data: {
      userId: TEST_USER_ID,
      status: 'PENDING',
      results: { create: TEST_URLS.map(url => ({ url, status: 'PENDING' })) },
    },
    include: { results: true },
  })
  console.log(`   ✓ Job created: ${job.id}`)

  console.log('3. Processing job (real scrape + Claude)...')
  const t0 = Date.now()
  await processJob(job.id)
  console.log(`   ✓ Processing done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  console.log('4. Reading results back from DB...')
  const final = await prisma.job.findUnique({
    where: { id: job.id },
    include: { results: true },
  })

  console.log(`\n   Job status: ${final?.status}`)
  for (const r of final?.results ?? []) {
    const kwCount = Array.isArray(r.keywords) ? r.keywords.length : 0
    console.log(`\n   ── ${r.url}`)
    console.log(`      status: ${r.status}`)
    if (r.status === 'COMPLETED') {
      console.log(`      keywords: ${kwCount}`)
      console.log(`      introText: ${r.introText ? r.introText.length + ' chars' : 'MISSING'}`)
      console.log(`      outroText: ${r.outroText ? r.outroText.length + ' chars' : 'MISSING'}`)
    } else if (r.status === 'FAILED') {
      console.log(`      error: ${r.error}`)
    }
  }

  console.log('\n5. Cleaning up test data...')
  await prisma.job.delete({ where: { id: job.id } })
  await prisma.user.delete({ where: { id: TEST_USER_ID } })
  console.log('   ✓ Cleaned up')

  // Verdict
  const completed = final?.results.filter(r => r.status === 'COMPLETED').length ?? 0
  const failed = final?.results.filter(r => r.status === 'FAILED').length ?? 0
  console.log(`\n=== VERDICT: ${completed} completed, ${failed} failed (clean) ===`)
  console.log(completed >= 1 && final?.status === 'COMPLETED'
    ? '✓✓✓ FULL PIPELINE WORKS END-TO-END WITH DATABASE'
    : '✗ Something is off — check output above')

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error('TEST FAILED:', e)
  await prisma.$disconnect()
  process.exit(1)
})
