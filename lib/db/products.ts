// 서버 전용 상품 조회 함수. DB 조회 실패 시 Mock 데이터로 대체하지 않고 오류를 그대로 던진다.
import "server-only"
import { cache } from "react"
import type { Product, ScentFamily } from "@/types/product"
import { describeTarget, readLabDatabaseUrl } from "./labTarget"
import { getPrisma } from "./prisma"
import { toProduct } from "./productMapping"

/** 실제 DB 조회임을 화면에서 확인하기 위한 정보 (비밀번호 제외) */
export type DbQuerySource = { target: string; currentDatabase: string; serverVersion: string; queriedAt: string; durationMs: number }

export type DbProductsResult = { products: Product[]; source: DbQuerySource }

async function querySource<T>(run: (prisma: ReturnType<typeof getPrisma>) => Promise<T>): Promise<{ value: T; source: DbQuerySource }> {
  const { target } = readLabDatabaseUrl()
  const prisma = getPrisma()
  const started = performance.now()
  const [value, [meta]] = await Promise.all([
    run(prisma),
    prisma.$queryRaw<{ current_database: string; server_version: string }[]>`
      SELECT current_database() AS current_database, current_setting('server_version') AS server_version`,
  ])
  return {
    value,
    source: {
      target: describeTarget(target),
      currentDatabase: meta.current_database,
      serverVersion: meta.server_version,
      queriedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
    },
  }
}

/** 전체 상품(또는 향 계열 하나)을 id 순으로 조회한다. */
export async function getProductsFromDb({ family }: { family?: ScentFamily } = {}): Promise<DbProductsResult> {
  const { value, source } = await querySource((prisma) =>
    prisma.product.findMany({ where: family ? { family } : undefined, orderBy: { id: "asc" } }),
  )
  return { products: value.map(toProduct), source }
}

/**
 * slug로 상품 한 개를 조회한다. 없으면 product: null (호출하는 쪽에서 404 처리).
 * generateMetadata와 페이지가 같은 요청에서 함께 호출하므로 React cache로 한 번만 조회한다.
 */
export const getProductBySlugFromDb = cache(async (slug: string): Promise<{ product: Product | null; source: DbQuerySource }> => {
  const { value, source } = await querySource((prisma) => prisma.product.findUnique({ where: { slug } }))
  return { product: value ? toProduct(value) : null, source }
})
