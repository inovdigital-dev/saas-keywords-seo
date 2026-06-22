import { prisma } from '../lib/prisma'
const BASE = 'http://localhost:3000'
const UID = 'test-cancel-user-001'
const URLS = [
  'https://www.auchan.pt/pt/alimentacao/produtos-lacteos/iogurtes/',
  'https://www.auchan.pt/pt/eletrodomesticos/pequenos-eletrodomesticos/aspiradores/',
  'https://www.auchan.pt/pt/alimentacao/mercearia/',
  'https://www.auchan.pt/pt/casa/',
]
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function main() {
  const job = await (await fetch(`${BASE}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: URLS, userId: UID, email: 'c@wpp.local', name: 'Teste cancelar' }) })).json()
  console.log(`job=${job.id} (4 URLs)`)
  await fetch(`${BASE}/api/jobs/${job.id}/run`, { method: 'POST' })
  console.log('worker arrancado; espero 8s e depois CANCELO…')
  await sleep(8000)
  await fetch(`${BASE}/api/jobs/${job.id}/cancel`, { method: 'POST' })
  console.log('cancelado. A confirmar que a cadeia pára…')
  let final: any = null
  for (let i = 0; i < 12; i++) {
    await sleep(3000)
    const j = await (await fetch(`${BASE}/api/jobs/${job.id}`)).json()
    const done = j.results.filter((x: any) => ['COMPLETED','FAILED'].includes(x.status)).length
    const pend = j.results.filter((x: any) => x.status === 'PENDING').length
    console.log(`   [${(i+1)*3}s] status=${j.status} processadas=${done} pendentes=${pend}`)
    if (j.status === 'CANCELLED') { final = j; // wait a bit more to ensure no further processing
      await sleep(6000)
      final = await (await fetch(`${BASE}/api/jobs/${job.id}`)).json()
      break }
  }
  if (final) {
    const done = final.results.filter((x: any) => ['COMPLETED','FAILED'].includes(x.status)).length
    const pend = final.results.filter((x: any) => x.status === 'PENDING').length
    console.log(`\nFINAL: status=${final.status}, processadas=${done}, não-processadas=${pend}`)
    const ok = final.status === 'CANCELLED' && pend > 0 && done < 4
    console.log(ok ? '✓✓✓ CANCELAMENTO PÁRA A CADEIA (sobram URLs não processadas)' : '✗ Não parou como esperado')
  } else console.log('✗ não cancelou')
  await prisma.job.deleteMany({ where: { userId: UID } })
  await prisma.user.deleteMany({ where: { id: UID } })
  await prisma.$disconnect()
}
main().catch(async e => { console.error('FALHOU:', e); await prisma.$disconnect(); process.exit(1) })
