"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { products as defaultProducts, scentFamilies } from "@/data/products"
import type { Product } from "@/types/product"
import {
  countLabel,
  familiesOf,
  type FamilyFilter,
  filterProducts,
  parseFamily,
  type SortKey,
  sortOptions,
} from "./catalog"
import { ProductCard } from "./ProductCard"
import { ProductIcon } from "./ProductIcon"
import { QuickView, useQuickView } from "./QuickView"

/**
 * 컬렉션 상단·검색/필터/정렬·결과 영역. 페이지 <main>과 MY AURA 배너는 AuraSite의 CollectionPage가 감싼다.
 * products·basePath를 생략하면 기존 /products 동작(Mock 데이터, /products 링크)과 같다.
 * DB 실험 화면(/lab/products)은 서버에서 조회한 상품 배열과 basePath를 넘기며, 이때 향 계열 탭도 그 배열에서 도출한다.
 */
export function ProductCollection({
  products = defaultProducts,
  basePath = "/products",
}: {
  products?: readonly Product[]
  basePath?: string
} = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const families = useMemo(() => (products === defaultProducts ? scentFamilies : familiesOf(products)), [products])
  const collectionVolumes = useMemo(() => [...new Set(products.map((product) => product.volume))].join(" / "), [products])
  // 향 계열은 URL(?family=)을 단일 기준으로 사용해 링크 이동·뒤로 가기와 항상 일치시킨다.
  const family: FamilyFilter = parseFamily(params.get("family"), families) ?? "All"
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("default")
  const quickView = useQuickView()

  const filtered = useMemo(
    () => filterProducts(products, { query, family, sort }),
    [family, products, query, sort],
  )

  const setFamily = (next: FamilyFilter) => {
    const search = new URLSearchParams(params.toString())
    if (next === "All") search.delete("family")
    else search.set("family", next)
    const qs = search.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const trimmedQuery = query.trim()
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label
  const hasConditions = family !== "All" || trimmedQuery !== "" || sort !== "default"
  const resetAll = () => {
    setQuery("")
    setSort("default")
    setFamily("All")
  }

  return (
    <>
      <section className="collection-hero page-shell">
        <div>
          <p className="eyebrow">AURA COLLECTION · {collectionVolumes}</p>
          <h1>
            Find Your
            <br />
            <em>Scent Veil.</em>
          </h1>
        </div>
        <p>
          향은 기억보다 먼저 당신을 말합니다.
          <br />
          피부 위에서 완성되는 {countLabel(products.length)} AURA를 만나보세요.
        </p>
      </section>

      <section aria-label="향 검색과 필터" className="shop-controls page-shell">
        <label className="search-box">
          <ProductIcon name="search" />
          <span className="sr-only">향 검색</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="향수 이름, 향 노트, 향 계열로 검색해 보세요."
            type="search"
            value={query}
          />
        </label>
        <div className="filter-row">
          <div aria-label="향 계열 필터" className="filter-tabs" role="group">
            {(["All", ...families] as const).map((item) => (
              <button
                aria-pressed={family === item}
                className={family === item ? "is-active" : ""}
                key={item}
                onClick={() => setFamily(item)}
                type="button"
              >
                {item === "All" ? "전체" : item}
              </button>
            ))}
          </div>
          <label className="sort-select">
            <span className="sr-only">정렬</span>
            <select onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ProductIcon name="chevron" />
          </label>
        </div>
      </section>

      <section aria-label="검색 결과" className="shop-results page-shell">
        <div className="result-bar">
          <p aria-live="polite" className="result-count">
            총 <strong>{filtered.length}</strong>개의 향
          </p>
          {hasConditions && (
            <div className="active-filters">
              {family !== "All" && (
                <button aria-label={`향 계열 ${family} 조건 해제`} onClick={() => setFamily("All")} type="button">
                  {family} <ProductIcon name="close" />
                </button>
              )}
              {trimmedQuery && (
                <button aria-label={`검색어 ${trimmedQuery} 조건 해제`} onClick={() => setQuery("")} type="button">
                  “{trimmedQuery}” <ProductIcon name="close" />
                </button>
              )}
              {sort !== "default" && (
                <button aria-label={`${sortLabel} 정렬 해제`} onClick={() => setSort("default")} type="button">
                  {sortLabel} <ProductIcon name="close" />
                </button>
              )}
              <button className="reset-filters" onClick={resetAll} type="button">
                조건 초기화
              </button>
            </div>
          )}
        </div>
        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((product, index) => (
              <ProductCard basePath={basePath} index={index} key={product.slug} onQuickView={quickView.open} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">NO SCENT FOUND</p>
            <h2>조건에 맞는 향을 찾지 못했어요.</h2>
            <p>
              {[trimmedQuery && `“${trimmedQuery}”`, family !== "All" && `${family} 계열`]
                .filter(Boolean)
                .join(" · ")}
              {" "}조건에 맞는 향이 없어요. 검색어를 바꾸거나 다른 향 계열을 선택해 보세요.
            </p>
            <button onClick={resetAll} type="button">
              조건 초기화하고 전체 향 보기
            </button>
          </div>
        )}
      </section>
      <QuickView basePath={basePath} onClose={quickView.close} product={quickView.product} />
    </>
  )
}
