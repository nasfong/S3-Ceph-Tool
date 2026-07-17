import Keycloak from "keycloak-js";
import { ENV } from "./env";

let keycloak: Keycloak | null = null;

const POPUP_NAME = "keycloak-login";
const POPUP_FEATURES = "width=520,height=720,menubar=no,toolbar=no,location=no,status=no";
const CALLBACK_MESSAGE = "keycloak:callback";
const POPUP_TIMEOUT_MS = 5 * 60 * 1000;

/** The browser refused to open the sign-in window. */
export class PopupBlockedError extends Error {
  constructor() {
    super("The sign-in window was blocked by the browser.");
    this.name = "PopupBlockedError";
  }
}

/** The user closed the sign-in window before finishing. */
export class PopupClosedError extends Error {
  constructor() {
    super("The sign-in window was closed before sign-in finished.");
    this.name = "PopupClosedError";
  }
}

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
 * True when the current URL is a Keycloak login callback.
 *
 * Keycloak returns the auth response in the URL fragment (response_mode=fragment),
 * so a login in progress is detectable from the URL alone — no need to persist
 * anything before redirecting away.
 */
export const isKeycloakCallback = (): boolean => {
  if (typeof window === "undefined") return false;

  const hasParam = (source: string, name: string) =>
    new RegExp(`[#&?]${name}=`).test(source);

  const { hash, search } = window.location;
  const hasResult =
    hasParam(hash, "code") ||
    hasParam(hash, "error") ||
    hasParam(search, "code") ||
    hasParam(search, "error");
  const hasState = hasParam(hash, "state") || hasParam(search, "state");

  return hasResult && hasState;
};

/** True when this window is the sign-in popup that Keycloak just returned to. */
export const isPopupCallback = (): boolean =>
  typeof window !== "undefined" &&
  !!window.opener &&
  window.opener !== window &&
  isKeycloakCallback();

/**
 * Runs in the popup: hand the callback to the window that opened us, then close.
 * The opener finishes the token exchange — the popup deliberately does not, so the
 * authorization code is spent exactly once, by the window that keeps the session.
 */
export const forwardCallbackToOpener = (): void => {
  const message = { type: CALLBACK_MESSAGE, hash: window.location.hash };

  try {
    window.opener?.postMessage(message, window.location.origin);
  } catch {
    // Ignored — the BroadcastChannel below is the fallback
  }

  // An identity provider sending COOP can sever window.opener. BroadcastChannel is
  // same-origin and unaffected, so it covers that case.
  try {
    const channel = new BroadcastChannel(CALLBACK_MESSAGE);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Ignored — nothing more we can do from here
  }

  window.close();
};

/** Resolves with the callback fragment the popup reports back. */
const waitForCallback = (popup: Window): Promise<string> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let channel: BroadcastChannel | null = null;
    let closedTimer: number | undefined;

    const cleanup = () => {
      window.removeEventListener("message", onWindowMessage);
      channel?.close();
      window.clearInterval(pollClosed);
      window.clearTimeout(timeout);
      window.clearTimeout(closedTimer);
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const accept = (data: unknown) => {
      const message = data as { type?: string; hash?: string } | null;
      if (message?.type !== CALLBACK_MESSAGE || typeof message.hash !== "string") return;
      settle(() => resolve(message.hash!));
    };

    function onWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      accept(event.data);
    }

    window.addEventListener("message", onWindowMessage);

    try {
      channel = new BroadcastChannel(CALLBACK_MESSAGE);
      channel.onmessage = (event) => accept(event.data);
    } catch {
      // BroadcastChannel unavailable — postMessage alone will have to do
    }

    // The popup posts its result immediately before closing, so a closed window is
    // only a cancellation if no message turns up right after.
    const pollClosed = window.setInterval(() => {
      if (!popup.closed || settled || closedTimer !== undefined) return;
      closedTimer = window.setTimeout(() => settle(() => reject(new PopupClosedError())), 500);
    }, 400);

    const timeout = window.setTimeout(
      () => settle(() => reject(new Error("Timed out waiting for Keycloak sign-in."))),
      POPUP_TIMEOUT_MS
    );
  });

/**
 * Signs in through a popup, leaving the current page untouched.
 *
 * Must be called directly from a click handler: the popup is opened synchronously,
 * because awaiting anything first loses the user gesture and the browser blocks it.
 */
export const loginWithPopup = async (): Promise<Keycloak> => {
  const popup = window.open("", POPUP_NAME, POPUP_FEATURES);
  if (!popup) throw new PopupBlockedError();

  const redirectUri = `${window.location.origin}/`;
  const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    // A throwaway instance, used only to build the login URL. Doing so writes the
    // state, nonce and PKCE verifier to localStorage under kc-callback-<state>,
    // which is where the instance below reads them back from.
    const urlBuilder = createKeycloak();
    await urlBuilder.init({ pkceMethod: "S256", checkLoginIframe: false });
    popup.location.href = await urlBuilder.createLoginUrl({ redirectUri });

    const hash = await waitForCallback(popup);

    // keycloak-js only ever reads a callback from window.location, so stage it here
    // and let a fresh instance consume it. This is the same path a redirect login
    // takes: the window that built the URL is gone, and a new instance picks the
    // verifier back up out of localStorage.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${hash}`);

    const kc = createKeycloak();
    await kc.init({ pkceMethod: "S256", checkLoginIframe: false });

    if (!kc.authenticated) {
      throw new Error("Keycloak returned from the popup without authenticating.");
    }

    keycloak = kc;
    return kc;
  } catch (error) {
    window.history.replaceState(window.history.state, "", originalUrl);
    if (!popup.closed) popup.close();
    throw error;
  }
};

/**
 * Full-page redirect sign-in. Used to resume a Keycloak callback on load, and as
 * the fallback when a popup cannot be opened.
 */
export const initializeKeycloak = async (): Promise<Keycloak> => {
  if (keycloak) {
    return keycloak;
  }

  const instance = createKeycloak();

  try {
    const authenticated = await instance.init({
      onLoad: "login-required",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });

    console.log("[Keycloak] Initialization successful, authenticated:", authenticated);
    keycloak = instance;
    return instance;
  } catch (error) {
    console.error("[Keycloak] Initialization error:", error);
    keycloak = null; // Reset so next attempt will reinitialize
    throw error;
  }
};
