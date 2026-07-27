import Keycloak from "keycloak-js";
import { ENV } from "./env";
import { openPopup, waitForCallback } from "./keycloak-popup";

let keycloak: Keycloak | null = null;

const INIT_OPTIONS = { pkceMethod: "S256", checkLoginIframe: false } as const;

const createKeycloak = (): Keycloak => {
  if (!ENV.KEYCLOAK_URL || !ENV.KEYCLOAK_REALM || !ENV.KEYCLOAK_CLIENT_ID) {
    throw new Error(
      `Missing Keycloak config: URL=${ENV.KEYCLOAK_URL}, REALM=${ENV.KEYCLOAK_REALM}, CLIENT_ID=${ENV.KEYCLOAK_CLIENT_ID}`
    );
  }

  return new Keycloak({
    url: ENV.KEYCLOAK_URL,
    realm: ENV.KEYCLOAK_REALM,
    clientId: ENV.KEYCLOAK_CLIENT_ID,
  });
};

/**
 * Builds the Keycloak login URL.
 *
 * Building it also stores the state, nonce and PKCE verifier in localStorage under
 * kc-callback-<state> — which is where finishPopupLogin() reads them back from.
 */
const buildLoginUrl = async (redirectUri: string): Promise<string> => {
  const urlBuilder = createKeycloak();
  await urlBuilder.init(INIT_OPTIONS);
  return urlBuilder.createLoginUrl({ redirectUri });
};

/**
 * Turns the callback the popup reported into a signed-in Keycloak instance.
 *
 * keycloak-js only ever reads a callback from window.location, so the fragment is
 * put there first and a fresh instance consumes it. This is the same path a
 * redirect login takes: the window that built the URL is gone, and a new instance
 * picks the verifier back up out of localStorage.
 */
const finishPopupLogin = async (hash: string): Promise<Keycloak> => {
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${hash}`);

  const instance = createKeycloak();
  await instance.init(INIT_OPTIONS);

  if (!instance.authenticated) {
    throw new Error("Keycloak returned from the popup without signing in.");
  }

  return instance;
};

/**
 * Popup sign-in: the current page stays put while the user signs in.
 *
 * Must be called straight from a click handler — see openPopup().
 */
export const loginWithPopup = async (): Promise<Keycloak> => {
  const popup = openPopup();
  const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    popup.location.href = await buildLoginUrl(`${window.location.origin}/`);
    keycloak = await finishPopupLogin(await waitForCallback(popup));
    return keycloak;
  } catch (error) {
    window.history.replaceState(window.history.state, "", originalUrl);
    if (!popup.closed) popup.close();
    throw error;
  }
};

/**
 * Forgets the signed-in instance.
 *
 * A full page reload used to do this for free. Logging out without one has to say
 * so explicitly, or the next sign-in would reuse the old signed-in instance.
 */
export const resetKeycloak = (): void => {
  keycloak = null;
};

/**
 * Redirect sign-in: leaves the page and comes back with the login result.
 * Used to resume a callback on load, and when a popup cannot be opened.
 */
export const initializeKeycloak = async (): Promise<Keycloak> => {
  if (keycloak) {
    return keycloak;
  }

  const instance = createKeycloak();

  try {
    const authenticated = await instance.init({ ...INIT_OPTIONS, onLoad: "login-required" });

    console.log("[Keycloak] Initialization successful, authenticated:", authenticated);
    keycloak = instance;
    return instance;
  } catch (error) {
    console.error("[Keycloak] Initialization error:", error);
    keycloak = null; // Reset so next attempt will reinitialize
    throw error;
  }
};
