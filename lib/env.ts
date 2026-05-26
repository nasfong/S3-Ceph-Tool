// lib/env.ts
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// ✅ Read process.env with STATIC keys (Next.js can replace these at build time)
const buildTimeEnv: Record<string, string> = {
  NEXT_PUBLIC_KEYCLOAK_URL:        process.env.NEXT_PUBLIC_KEYCLOAK_URL        ?? "",
  NEXT_PUBLIC_KEYCLOAK_REALM:      process.env.NEXT_PUBLIC_KEYCLOAK_REALM      ?? "",
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID:  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID  ?? "",
  NEXT_PUBLIC_GATEWAY_URL:         process.env.NEXT_PUBLIC_GATEWAY_URL         ?? "",
  NEXT_PUBLIC_S3_ENDPOINT:         process.env.NEXT_PUBLIC_S3_ENDPOINT         ?? "",
  NEXT_PUBLIC_CERTIFICATE:         process.env.NEXT_PUBLIC_CERTIFICATE         ?? "",
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
  KEYCLOAK_URL:       getEnv("NEXT_PUBLIC_KEYCLOAK_URL"),
  KEYCLOAK_REALM:     getEnv("NEXT_PUBLIC_KEYCLOAK_REALM"),
  KEYCLOAK_CLIENT_ID: getEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID"),
  GATEWAY_URL:        getEnv("NEXT_PUBLIC_GATEWAY_URL"),
  S3_ENDPOINT:        getEnv("NEXT_PUBLIC_S3_ENDPOINT"),
  CERTIFICATE:        getEnv("NEXT_PUBLIC_CERTIFICATE") === "true",
};