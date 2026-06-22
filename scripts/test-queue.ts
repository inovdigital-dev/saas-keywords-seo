import { prisma } from '../lib/prisma'
const BASE = 'http://localhost:3000'
const UID = 'test-queue-user-001'
const URLS = [
  'https://www.auchan.pt/pt/alimentacao/produtos-lacteos/iogurtes/',
  'https://www.adidas.pt/casacos-mulher',
  'https://www.auchan.pt/pt/eletrodomesticos/pequenos-eletrodomesticos/aspiradores/',
]
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('1. POST /api/jobs (cria job)…')
  const createRes = await fetch(`${BASE}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: URLS, userId: UID, email: 'queue@wpp.local', name: 'Teste fila server-side' }),
  })
  const job = await createRes.json()
  console.log(`   job=${job.id} status=${job.status} results=${job.results?.length}`)

  console.log('2. POST /run (arranca worker server-side)…')
  await fetch(`${BASE}/api/jobs/${job.id}/run`, { method: 'POST' })

  console.log('3. Polling (simula utilizador a ver progresso, SEM conduzir o processamento)…')
  let final: any = null
  for (let i = 0; i < 40; i++) {
    await sleep(3000)
    const r = await fetch(`${BASE}/api/jobs/${job.id}`)
    const j = await r.json()
    const done = j.results.filter((x: any) => x.status === 'COMPLETED' || x.status === 'FAILED').length
    console.log(`   [${(i + 1) * 3}s] status=${j.status} progresso=${done}/${j.results.length}`)
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.status)) { final = j; break }
  }

  if (!final) { console.log('✗ TIMEOUT — não terminou a tempo'); }
  else {
    console.log(`\n   RESULTADO: status=${final.status}`)
    for (const r of final.results) {
      const kws = Array.isArray(r.keywords) ? r.keywords.length : 0
      console.log(`   • ${r.status.padEnd(10)} ${r.url}${r.status === 'COMPLETED' ? ` (${kws} kw)` : r.status === 'FAILED' ? ` — ${r.error?.slice(0, 50)}` : ''}`)
    }
    const ok = final.status === 'COMPLETED' && final.results.filter((r: any) => r.status === 'COMPLETED').length === 2
    console.log(ok ? '\n✓✓✓ FILA SERVER-SIDE FUNCIONA (processou sem o cliente conduzir)' : '\n✗ Algo errado')
  }

  console.log('\n4. Cleanup…')
  await prisma.job.deleteMany({ where: { userId: UID } })
  await prisma.user.deleteMany({ where: { id: UID } })
  await prisma.$disconnect()
}
main().catch(async e => { console.error('FALHOU:', e); await prisma.$disconnect(); process.exit(1) })
