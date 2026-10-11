// 마이그레이션 전 안전 점검 (읽기 전용). 연결 대상이 aura_mall_lab인지 확인하고 public 스키마의 기존 테이블을 보여 준다.
import { connectLabDatabase } from "./labClient"

async function main() {
  const prisma = await connectLabDatabase()
  try {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    console.log(`[check] public 스키마 테이블: ${tables.length ? tables.map((t) => t.table_name).join(", ") : "(없음)"}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(`[check] 실패: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
