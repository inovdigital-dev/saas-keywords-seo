import { prisma } from '../lib/prisma'
async function main() {
  const users = await prisma.user.findMany({ include: { _count: { select: { jobs: true } } } })
  console.log(`Total users: ${users.length}`)
  for (const u of users) {
    // UUID has dashes in 8-4-4-4-12 pattern; cuid starts with 'c' and no dashes
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id)
    console.log(`  id=${u.id} | email=${u.email} | jobs=${u._count.jobs} | ${isUuid ? 'UUID (válido)' : 'CUID ANTIGO (órfão)'}`)
  }
  await prisma.$disconnect()
}
main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
