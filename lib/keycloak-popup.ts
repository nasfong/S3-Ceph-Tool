/**
 * The sign-in popup: opening it, and waiting for it to report the login result.
 */
import { CALLBACK_MESSAGE, CallbackMessage } from "./keycloak-callback";

const POPUP_NAME = "keycloak-login";
const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 720;

function buildPopupFeatures(): string {
  const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
  const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;

  return [
    `width=${POPUP_WIDTH}`,
    `height=${POPUP_HEIGHT}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}
const TIMEOUT_MS = 5 * 60 * 1000;
const CLOSED_GRACE_MS = 500;
const POLL_MS = 400;

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

/**
 * Opens the (initially blank) sign-in window.
 *
 * Must be called straight from a click handler: awaiting anything first loses the
 * user gesture, and the browser blocks the popup.
 */
export const openPopup = (): Window => {
  const features = buildPopupFeatures();
  const popup = window.open("", POPUP_NAME, features);
  if (!popup) throw new PopupBlockedError();
  return popup;
};

/** Resolves with the callback fragment the popup reports back. */
export const waitForCallback = (popup: Window): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    let finished = false;

    function stopListening() {
      window.removeEventListener("message", onMessage);
      window.clearInterval(closedPoll);
      window.clearTimeout(timeout);
    }

    function succeed(hash: string) {
      if (finished) return;
      finished = true;
      stopListening();
      resolve(hash);
    }

    function fail(error: Error) {
      if (finished) return;
      finished = true;
      stopListening();
      reject(error);
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      const message = event.data as Partial<CallbackMessage> | null;
      if (message?.type !== CALLBACK_MESSAGE || typeof message.hash !== "string") return;

      succeed(message.hash);
    }

    // A closed popup normally means the user gave up. But it also closes itself
    // right after reporting success, so leave a moment for that message to land.
    const closedPoll = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(closedPoll);
      window.setTimeout(() => fail(new PopupClosedError()), CLOSED_GRACE_MS);
    }, POLL_MS);

    const timeout = window.setTimeout(
      () => fail(new Error("Timed out waiting for Keycloak sign-in.")),
      TIMEOUT_MS
    );

    window.addEventListener("message", onMessage);
  });
