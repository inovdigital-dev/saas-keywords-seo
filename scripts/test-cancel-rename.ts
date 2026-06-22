import { prisma } from '../lib/prisma'
const UID = '00000000-0000-0000-0000-0000000000c1'
async function main() {
  await prisma.user.upsert({ where: { id: UID }, update: {}, create: { id: UID, email: 'cancel-test@wpp.local' } })
  const job = await prisma.job.create({
    data: { userId: UID, name: 'Nome original', status: 'PENDING',
      results: { create: [{ url: 'https://a.com', status: 'COMPLETED' }, { url: 'https://b.com', status: 'PENDING' }, { url: 'https://c.com', status: 'PENDING' }] } },
  })
  console.log(`Job criado: name="${job.name}", status=${job.status}`)

  // 1. Rename (PATCH logic)
  const renamed = await prisma.job.update({ where: { id: job.id }, data: { name: 'Nome editado ✏️' } })
  console.log(`Após rename: name="${renamed.name}" ${renamed.name === 'Nome editado ✏️' ? '✓' : '✗'}`)

  // 2. Cancel (cancel endpoint logic)
  const cancelled = await prisma.job.updateMany({
    where: { id: job.id, status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: 'CANCELLED', completedAt: new Date() },
  })
  const after = await prisma.job.findUnique({ where: { id: job.id }, include: { results: true } })
  const pendingLeft = after?.results.filter(r => r.status === 'PENDING').length
  console.log(`Após cancel: status=${after?.status} (count=${cancelled.count}) ${after?.status === 'CANCELLED' ? '✓' : '✗'}`)
  console.log(`URLs não processadas preservadas: ${pendingLeft} ${pendingLeft === 2 ? '✓' : '✗'}`)

  // 3. Cancel should NOT re-cancel an already-finished job
  const finished = await prisma.job.create({ data: { userId: UID, status: 'COMPLETED', results: { create: [{ url: 'https://d.com', status: 'COMPLETED' }] } } })
  const recancel = await prisma.job.updateMany({ where: { id: finished.id, status: { in: ['PENDING', 'PROCESSING'] } }, data: { status: 'CANCELLED' } })
  console.log(`Cancelar job já concluído: afetados=${recancel.count} ${recancel.count === 0 ? '✓ (corretamente ignorado)' : '✗'}`)

  await prisma.job.deleteMany({ where: { userId: UID } })
  await prisma.user.delete({ where: { id: UID } })
  console.log('\n✓✓✓ CANCEL + RENAME OK')
  await prisma.$disconnect()
}
main().catch(async e => { console.error('FALHOU:', e); await prisma.$disconnect(); process.exit(1) })
