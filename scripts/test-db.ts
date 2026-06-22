// End-to-end test of the NEW async flow against the REAL database:
// create job (name + URLs) → process each result individually → finalize → read back.
import { prisma } from '../lib/prisma'
import { processResult } from '../lib/process'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const TEST_EMAIL = 'pipeline-test@wppcommerce.local'
const JOB_NAME = 'Teste automático — lacticínios e aspiradores'
const TEST_URLS = [
  'https://www.auchan.pt/pt/alimentacao/produtos-lacteos/iogurtes/',
  'https://www.adidas.pt/casacos-mulher', // expected FAIL (anti-bot)
  'https://www.auchan.pt/pt/eletrodomesticos/pequenos-eletrodomesticos/aspiradores/',
]

// Mirror of the finalize logic in /api/jobs/[jobId]/process
async function finalizeIfDone(jobId: string) {
  const remaining = await prisma.jobResult.count({
    where: { jobId, status: { in: ['PENDING', 'PROCESSING'] } },
  })
  if (remaining === 0) {
    const failed = await prisma.jobResult.count({ where: { jobId, status: 'FAILED' } })
    const total = await prisma.jobResult.count({ where: { jobId } })
    await prisma.job.update({
      where: { id: jobId },
      data: { status: failed === total ? 'FAILED' : 'COMPLETED', completedAt: new Date() },
    })
  }
}

async function main() {
  console.log('1. Upsert user...')
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: { email: TEST_EMAIL },
    create: { id: TEST_USER_ID, email: TEST_EMAIL },
  })

  console.log('2. Create job (with name) + PENDING results...')
  const job = await prisma.job.create({
    data: {
      userId: TEST_USER_ID,
      name: JOB_NAME,
      status: 'PENDING',
      results: { create: TEST_URLS.map(url => ({ url, status: 'PENDING' })) },
    },
    include: { results: true },
  })
  console.log(`   ✓ Job ${job.id} | name="${job.name}"`)

  console.log('3. Process each URL individually (new per-URL flow)...')
  await prisma.job.update({ where: { id: job.id }, data: { status: 'PROCESSING' } })
  const t0 = Date.now()
  for (const r of job.results) {
    await processResult(r.id)
    await finalizeIfDone(job.id)
  }
  console.log(`   ✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  console.log('4. Read back...')
  const final = await prisma.job.findUnique({ where: { id: job.id }, include: { results: true } })
  console.log(`\n   Job status: ${final?.status} | name: "${final?.name}"`)
  for (const r of final?.results ?? []) {
    const kws = Array.isArray(r.keywords) ? (r.keywords as { keyword: string }[]) : []
    console.log(`\n   ── ${r.url}`)
    console.log(`      status: ${r.status}`)
    if (r.status === 'COMPLETED') {
      console.log(`      keywords (${kws.length}): ${kws.map(k => k.keyword).join(', ')}`)
      console.log(`      intro: ${r.introText ? r.introText.length + ' chars' : 'MISSING'} | outro: ${r.outroText ? r.outroText.length + ' chars' : 'MISSING'}`)
      // Verify intro actually contains at least one of the top-2 keywords (for bolding)
      const top2 = kws.slice(0, 2).map(k => k.keyword.toLowerCase())
      const introHasKw = top2.some(k => (r.introText ?? '').toLowerCase().includes(k))
      console.log(`      intro contém keyword p/ bold: ${introHasKw ? '✓' : '✗ (não encontrada)'}`)
    } else {
      console.log(`      error: ${r.error}`)
    }
  }

  console.log('\n5. Cleanup...')
  await prisma.job.delete({ where: { id: job.id } })
  await prisma.user.delete({ where: { id: TEST_USER_ID } })

  const completed = final?.results.filter(r => r.status === 'COMPLETED').length ?? 0
  const failed = final?.results.filter(r => r.status === 'FAILED').length ?? 0
  const ok = completed === 2 && failed === 1 && final?.status === 'COMPLETED' && final?.name === JOB_NAME
  console.log(`\n=== VERDICT: ${completed} completed, ${failed} failed, status=${final?.status} ===`)
  console.log(ok ? '✓✓✓ NEW ASYNC FLOW WORKS END-TO-END (mixed status handled, name stored)' : '✗ Algo está errado — ver acima')
  await prisma.$disconnect()
}

main().catch(async e => { console.error('TEST FAILED:', e); await prisma.$disconnect(); process.exit(1) })
