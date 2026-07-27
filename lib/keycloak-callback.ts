/**
 * The Keycloak login callback — the URL Keycloak sends the browser back to after
 * a login, carrying the authorization code in the fragment.
 */

export const CALLBACK_MESSAGE = "keycloak:callback";

export type CallbackMessage = {
  type: typeof CALLBACK_MESSAGE;
  hash: string;
};

/** True when the current URL carries a Keycloak login result. */
export const isKeycloakCallback = (): boolean => {
  if (typeof window === "undefined") return false;

  const inHash = new URLSearchParams(window.location.hash.slice(1));
  const inQuery = new URLSearchParams(window.location.search);
  const has = (name: string) => inHash.has(name) || inQuery.has(name);

  return (has("code") || has("error")) && has("state");
};

/** True when this window is the sign-in popup Keycloak just returned to. */
export const isPopupCallback = (): boolean =>
  typeof window !== "undefined" &&
  !!window.opener &&
  window.opener !== window &&
  isKeycloakCallback();

/**
 * Runs in the popup: hand the callback to the window that opened us, then close.
 * The opener finishes the sign-in, so the authorization code is used exactly once.
 */
export const sendCallbackToOpener = (): void => {
  const message: CallbackMessage = {
    type: CALLBACK_MESSAGE,
    hash: window.location.hash,
  };

  window.opener?.postMessage(message, window.location.origin);
  window.close();
};
