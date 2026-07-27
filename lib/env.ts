// lib/env.ts
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// ✅ Read process.env with STATIC keys (Next.js can replace these at build time)
const buildTimeEnv: Record<string, string> = {
  NEXT_PUBLIC_KEYCLOAK_URL:
    process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "https://id.testing.sabay.com/",
  NEXT_PUBLIC_KEYCLOAK_REALM: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "cloud",
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID:
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "cloud_user",
  NEXT_PUBLIC_GATEWAY_URL:
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    "https://cloud-gateway.testing.sabay.com/graphql",
  NEXT_PUBLIC_S3_ENDPOINT:
    process.env.NEXT_PUBLIC_S3_ENDPOINT ?? "https://fsgw.sabay.test",
  NEXT_PUBLIC_CERTIFICATE: process.env.NEXT_PUBLIC_CERTIFICATE ?? "false",
  // Feature flags — disabled by default, set to "true" to enable.
  NEXT_PUBLIC_ENABLE_CREATE_BUCKET:
    process.env.NEXT_PUBLIC_ENABLE_CREATE_BUCKET ?? "false",
  NEXT_PUBLIC_ENABLE_BUCKET_ACL_TOGGLE:
    process.env.NEXT_PUBLIC_ENABLE_BUCKET_ACL_TOGGLE ?? "false",
  NEXT_PUBLIC_ENABLE_DELETE_BUCKET:
    process.env.NEXT_PUBLIC_ENABLE_DELETE_BUCKET ?? "false",
};

function getEnv(key: string): string {
  // 1. Runtime browser: window.__ENV__ (injected by entrypoint.sh)
  if (typeof window !== "undefined" && window.__ENV__?.[key]) {
    return window.__ENV__[key];
  }
  // 2. SSR or build time: statically mapped above
  return buildTimeEnv[key] ?? "";
}

export const ENV = {
  KEYCLOAK_URL: getEnv("NEXT_PUBLIC_KEYCLOAK_URL"),
  KEYCLOAK_REALM: getEnv("NEXT_PUBLIC_KEYCLOAK_REALM"),
  KEYCLOAK_CLIENT_ID: getEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID"),
  GATEWAY_URL: getEnv("NEXT_PUBLIC_GATEWAY_URL"),
  S3_ENDPOINT: getEnv("NEXT_PUBLIC_S3_ENDPOINT"),
  CERTIFICATE: getEnv("NEXT_PUBLIC_CERTIFICATE") === "true",
  ENABLE_CREATE_BUCKET: getEnv("NEXT_PUBLIC_ENABLE_CREATE_BUCKET") === "true",
  ENABLE_BUCKET_ACL_TOGGLE:
    getEnv("NEXT_PUBLIC_ENABLE_BUCKET_ACL_TOGGLE") === "true",
  ENABLE_DELETE_BUCKET: getEnv("NEXT_PUBLIC_ENABLE_DELETE_BUCKET") === "true",
};
