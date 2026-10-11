// 서버 전용 상품 조회 함수. DB 조회 실패 시 Mock 데이터로 대체하지 않고 오류를 그대로 던진다.
import "server-only"
import type { Product } from "@/types/product"
import { describeTarget, readLabDatabaseUrl } from "./labTarget"
import { getPrisma } from "./prisma"
import { toProduct } from "./productMapping"

export type DbProductsResult = {
  products: Product[]
  /** 실제 DB 조회임을 화면에서 확인하기 위한 정보 (비밀번호 제외) */
  source: { target: string; currentDatabase: string; serverVersion: string; queriedAt: string; durationMs: number }
}

export async function getProductsFromDb(): Promise<DbProductsResult> {
  const { target } = readLabDatabaseUrl()
  const prisma = getPrisma()
  const started = performance.now()
  const [rows, [meta]] = await Promise.all([
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.$queryRaw<{ current_database: string; server_version: string }[]>`
      SELECT current_database() AS current_database, current_setting('server_version') AS server_version`,
  ])
  const durationMs = Math.round(performance.now() - started)
  return {
    products: rows.map(toProduct),
    source: {
      target: describeTarget(target),
      currentDatabase: meta.current_database,
      serverVersion: meta.server_version,
      queriedAt: new Date().toISOString(),
      durationMs,
    },
  }
}
