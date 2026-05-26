import Keycloak from "keycloak-js";
import { ENV } from "./env";

let keycloak: Keycloak | null = null;

export const initializeKeycloak = async (): Promise<Keycloak> => {
  if (keycloak) {
    return keycloak;
  }

  keycloak = new Keycloak({
    url: ENV.KEYCLOAK_URL,
    realm: ENV.KEYCLOAK_REALM,
    clientId: ENV.KEYCLOAK_CLIENT_ID,
  });

  await keycloak.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  return keycloak;
};
