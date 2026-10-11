// DB 기반 상품 상세 실험 화면. 상품·관련 상품 모두 PostgreSQL에서 요청마다 조회한다.
// 상세 UI는 기존 ProductDetail을 재사용하고, 관련 상품 후보(catalog)와 링크 기준 경로(basePath)만 주입한다.
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ProductDetailPage } from "@/components/AuraSite"
import { getProductBySlugFromDb, getProductsFromDb } from "@/lib/db/products"
import { LabDbErrorPanel } from "../LabDbErrorPanel"
import { requireLabAccess, tryDb } from "../labAccess"
import { LAB_PRODUCTS_PATH } from "../labRoutes"
import "../lab-products.css"

type Props = { params: Promise<{ slug: string }> }

// generateStaticParams를 두지 않는다: 빌드 시 DB 상품을 정적 생성하지 않고 요청마다 조회한다.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireLabAccess()
  const { slug } = await params
  const robots = { index: false, follow: false }
  // 같은 요청의 페이지 본문과 React cache를 공유하므로 DB 조회는 한 번만 일어난다.
  const result = await tryDb("lab/products/[slug] metadata", () => getProductBySlugFromDb(slug))
  if (!result.ok) return { title: "DB 오류 — AURA LAB", robots }
  if (!result.data.product) return { title: "상품을 찾을 수 없어요 — AURA LAB", robots }
  return { title: `${result.data.product.name} — AURA LAB`, description: result.data.product.description, robots }
}

export default async function LabProductDetailPage({ params }: Props) {
  await requireLabAccess()
  const { slug } = await params
  const result = await tryDb("lab/products/[slug]", () =>
    Promise.all([getProductBySlugFromDb(slug), getProductsFromDb()]),
  )

  if (!result.ok) {
    return (
      <main className="lab-products page-shell">
        <header className="lab-products-header">
          <p className="eyebrow">AURA LAB · POSTGRESQL</p>
          <h1>DB 상품 상세 실험</h1>
        </header>
        <LabDbErrorPanel error={result.error}>
          <p><Link href={LAB_PRODUCTS_PATH}>실험 목록으로 돌아가기</Link></p>
        </LabDbErrorPanel>
      </main>
    )
  }

  const [{ product, source }, { products: catalog }] = result.data
  // DB 연결은 정상이지만 해당 slug가 없을 때만 404. (try 밖에서 호출해야 notFound가 오류로 잡히지 않는다)
  if (!product) notFound()

  return (
    <>
      <aside aria-label="DB 실험 안내" className="lab-detail-notice">
        <div className="page-shell">
          <p>
            <strong>AURA LAB</strong> · PostgreSQL <code>{source.currentDatabase}</code>에서 조회한 상세 · 내부 실험용 경로
          </p>
          <Link href={LAB_PRODUCTS_PATH}>실험 목록</Link>
        </div>
      </aside>
      <ProductDetailPage basePath={LAB_PRODUCTS_PATH} catalog={catalog} product={product} />
    </>
  )
}
