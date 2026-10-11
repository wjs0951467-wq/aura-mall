// 실험용 DB 대상 확인. 시드·검증 스크립트(Node)와 Next 서버 코드가 함께 사용하므로 server-only를 넣지 않는다.
// 연결 문자열 전체나 비밀번호는 절대 출력하지 않고, 호스트·포트·DB 이름만 다룬다.

export const LAB_DATABASE_NAME = "aura_mall_lab"

export type LabTarget = { host: string; port: string; database: string }

export class LabDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LabDatabaseConfigError"
  }
}

/** DATABASE_URL을 해석해 aura_mall_lab을 가리키는지 확인하고, 안전하게 출력 가능한 정보만 돌려준다. */
export function readLabDatabaseUrl(value = process.env.DATABASE_URL): { url: string; target: LabTarget } {
  if (!value) {
    throw new LabDatabaseConfigError("DATABASE_URL이 설정되지 않았습니다. 프로젝트 루트의 .env 파일을 확인하세요.")
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new LabDatabaseConfigError("DATABASE_URL 형식이 올바르지 않습니다. (.env.example 형식 참고)")
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new LabDatabaseConfigError("DATABASE_URL은 postgresql:// 로 시작해야 합니다.")
  }
  const target: LabTarget = {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  }
  if (target.database !== LAB_DATABASE_NAME) {
    throw new LabDatabaseConfigError(
      `DATABASE_URL이 '${target.database || "(없음)"}' DB를 가리킵니다. 이 실험은 '${LAB_DATABASE_NAME}' DB에서만 실행합니다.`,
    )
  }
  return { url: value, target }
}

export const describeTarget = ({ host, port, database }: LabTarget) => `${host}:${port}/${database}`
