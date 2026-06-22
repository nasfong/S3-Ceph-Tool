import Keycloak from "keycloak-js";
import { ENV } from "./env";

let keycloak: Keycloak | null = null;

export const initializeKeycloak = async (): Promise<Keycloak> => {
  if (keycloak) {
    return keycloak;
  }

  // Validate required environment variables
  if (!ENV.KEYCLOAK_URL || !ENV.KEYCLOAK_REALM || !ENV.KEYCLOAK_CLIENT_ID) {
    throw new Error(
      `Missing Keycloak config: URL=${ENV.KEYCLOAK_URL}, REALM=${ENV.KEYCLOAK_REALM}, CLIENT_ID=${ENV.KEYCLOAK_CLIENT_ID}`
    );
  }

  keycloak = new Keycloak({
    url: ENV.KEYCLOAK_URL,
    realm: ENV.KEYCLOAK_REALM,
    clientId: ENV.KEYCLOAK_CLIENT_ID,
  });

  try {
    const authenticated = await keycloak.init({
      onLoad: "login-required",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });
    
    console.log("[Keycloak] Initialization successful, authenticated:", authenticated);
    return keycloak;
  } catch (error) {
    console.error("[Keycloak] Initialization error:", error);
    keycloak = null; // Reset so next attempt will reinitialize
    throw error;
  }
};
