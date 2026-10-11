// /lab/products 목록·상세가 함께 쓰는 접근 제한과 DB 오류 분류.
import "server-only"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { LabDatabaseConfigError } from "@/lib/db/labTarget"

/**
 * 요청 시점에만 실행되게 하고(빌드 시 DB 조회·정적 생성 방지),
 * 운영 빌드에서는 ENABLE_DB_LAB=true일 때만 연다. 개발 서버에서는 항상 열림.
 */
export async function requireLabAccess() {
  await connection()
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DB_LAB !== "true") notFound()
}

export type LabDbError = { title: string; detail: string; code: string }

/** 오류 원인을 초보자가 알아볼 수 있게 분류한다. 원본 메시지(연결 정보 포함 가능)는 화면에 그대로 노출하지 않는다. */
export function describeDbError(error: unknown): LabDbError {
  if (error instanceof LabDatabaseConfigError) {
    return { title: "DB 연결 설정을 확인해 주세요.", detail: error.message, code: error.name }
  }
  const code = (error as { code?: unknown })?.code
  const name = error instanceof Error ? error.name : "UnknownError"
  const label = typeof code === "string" ? code : name
  const text = error instanceof Error ? error.message : ""
  if (label === "P2021" || /does not exist/i.test(text)) {
    return { title: "products 테이블이 없습니다.", detail: "마이그레이션(npm run db:migrate)과 시드(npm run db:seed)를 먼저 실행하세요.", code: label }
  }
  if (label === "P1000" || /authentication|password/i.test(text)) {
    return { title: "DB 인증에 실패했습니다.", detail: ".env의 DATABASE_URL 사용자·비밀번호를 확인하세요.", code: label }
  }
  if (label === "ECONNREFUSED" || label === "P1001" || /ECONNREFUSED|reach|connect/i.test(text)) {
    return { title: "PostgreSQL 서버에 연결할 수 없습니다.", detail: "PostgreSQL 서비스가 실행 중인지, 호스트·포트가 맞는지 확인하세요.", code: label }
  }
  return { title: "DB에서 상품을 불러오지 못했습니다.", detail: "서버 터미널 로그에서 오류 코드를 확인하세요.", code: label }
}

/** DB 조회를 실행하고, 실패하면 분류된 오류를 돌려준다. (Mock 대체 없음) */
export async function tryDb<T>(where: string, run: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: LabDbError }> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    const described = describeDbError(error)
    console.error(`[${where}] DB 조회 실패 (${described.code}): ${described.title}`)
    return { ok: false, error: described }
  }
}
