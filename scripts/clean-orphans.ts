import { prisma } from '../lib/prisma'
async function main() {
  // Delete user rows whose id is NOT a valid Supabase UUID (leftover cuid rows from before migration)
  const users = await prisma.user.findMany()
  let deleted = 0
  for (const u of users) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id)
    if (!isUuid) {
      await prisma.user.delete({ where: { id: u.id } })
      console.log(`Deleted orphan: ${u.id} (${u.email})`)
      deleted++
    }
  }
  const remaining = await prisma.user.count()
  console.log(`\nOrphans deleted: ${deleted}. Users remaining: ${remaining}`)
  await prisma.$disconnect()
}
main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
