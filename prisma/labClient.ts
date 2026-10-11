// 시드·검증 스크립트용 Prisma 클라이언트. 연결 전에 DATABASE_URL이 aura_mall_lab을 가리키는지,
// 연결 후에도 실제 current_database()가 aura_mall_lab인지 두 번 확인한다.
import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"
import { describeTarget, LAB_DATABASE_NAME, readLabDatabaseUrl } from "../lib/db/labTarget"

export async function connectLabDatabase() {
  const { url, target } = readLabDatabaseUrl()
  console.log(`[lab] 연결 대상: ${describeTarget(target)}`)
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  const [{ current_database }] = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`
  if (current_database !== LAB_DATABASE_NAME) {
    await prisma.$disconnect()
    throw new Error(`실제 연결된 DB가 '${current_database}'입니다. '${LAB_DATABASE_NAME}'이 아니므로 중단합니다.`)
  }
  console.log(`[lab] current_database() = ${current_database} 확인`)
  return prisma
}
