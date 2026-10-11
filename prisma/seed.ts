// data/products.ts의 상품 6종을 products 테이블에 upsert한다.
// id 기준 upsert라 여러 번 실행해도 행이 늘지 않고, 기존 데이터 값으로 덮어쓴다. 삭제는 하지 않는다.
import { products } from "../data/products"
import { toProductRow } from "../lib/db/productMapping"
import { connectLabDatabase } from "./labClient"

async function main() {
  const prisma = await connectLabDatabase()
  try {
    const before = await prisma.product.count()
    await prisma.$transaction(
      products.map((product) => {
        const { id, ...fields } = toProductRow(product)
        return prisma.product.upsert({ where: { id }, create: { id, ...fields }, update: fields })
      }),
    )
    const after = await prisma.product.count()
    console.log(`[seed] upsert ${products.length}건 완료 · 실행 전 ${before}행 → 실행 후 ${after}행`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(`[seed] 실패: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
