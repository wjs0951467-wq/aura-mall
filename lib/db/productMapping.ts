// Product 타입(화면용) ↔ products 테이블 행(DB용) 변환. 노트는 DB에서 세 컬럼으로 나뉘어 저장된다.
// 시드 스크립트에서도 사용하므로 server-only를 넣지 않는다. (DB 연결 코드는 포함하지 않음)
import type { Product as ProductRow } from "@/generated/prisma/client"
import type { Product } from "@/types/product"

const assetKeys = ["white-bottle", "pink-bottle", "amber-bottle"] as const

export type { ProductRow }

export function toProductRow(product: Product): ProductRow {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    family: product.family,
    price: product.price,
    volume: product.volume,
    concentration: product.concentration,
    imageUrl: product.imageUrl,
    description: product.description,
    story: product.story,
    noteTop: product.notes.top,
    noteHeart: product.notes.heart,
    noteBase: product.notes.base,
    image: product.image,
    accent: product.accent,
  }
}

export function toProduct(row: ProductRow): Product {
  const image = assetKeys.find((key) => key === row.image)
  if (!image) {
    throw new Error(`products.id=${row.id}의 image 값 '${row.image}'은 지원하지 않는 이미지 키입니다.`)
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    family: row.family,
    price: row.price,
    volume: row.volume,
    concentration: row.concentration,
    imageUrl: row.imageUrl,
    description: row.description,
    story: row.story,
    notes: { top: row.noteTop, heart: row.noteHeart, base: row.noteBase },
    image,
    accent: row.accent,
  }
}
