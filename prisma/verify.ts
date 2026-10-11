// DB의 상품이 data/products.ts와 일치하는지 확인한다. 읽기 전용(SELECT만 실행).
import { products } from "../data/products"
import { toProduct } from "../lib/db/productMapping"
import { connectLabDatabase } from "./labClient"

async function main() {
  const prisma = await connectLabDatabase()
  try {
    const rows = await prisma.product.findMany({ orderBy: { id: "asc" } })
    const problems: string[] = []
    if (rows.length !== products.length) problems.push(`행 수 ${rows.length} (기대값 ${products.length})`)

    for (const expected of products) {
      const row = rows.find((item) => item.id === expected.id)
      if (!row) {
        problems.push(`id=${expected.id} (${expected.slug}) 행 없음`)
        continue
      }
      const actual = toProduct(row)
      const fields = Object.keys(expected) as (keyof typeof expected)[]
      for (const field of fields) {
        if (JSON.stringify(actual[field]) !== JSON.stringify(expected[field])) {
          problems.push(`id=${expected.id} ${field}: DB=${JSON.stringify(actual[field])} / 데이터=${JSON.stringify(expected[field])}`)
        }
      }
    }

    console.table(rows.map(({ id, slug, name, family, price, imageUrl }) => ({ id, slug, name, family, price, imageUrl })))
    if (problems.length) {
      console.error(`[verify] 불일치 ${problems.length}건\n- ${problems.join("\n- ")}`)
      process.exitCode = 1
    } else {
      console.log(`[verify] 통과 · ${rows.length}행, 모든 필드가 data/products.ts와 일치`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(`[verify] 실패: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
