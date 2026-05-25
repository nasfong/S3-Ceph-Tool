import Keycloak from "keycloak-js";

let keycloak: Keycloak | null = null;

export const initializeKeycloak = async (): Promise<Keycloak> => {
  if (keycloak) {
    return keycloak;
  }

  keycloak = new Keycloak({
    url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
  });

  await keycloak.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  return keycloak;
};
