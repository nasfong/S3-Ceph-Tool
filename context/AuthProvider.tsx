"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import Keycloak from "keycloak-js";
import { useRouter } from "next/navigation";
import { initializeKeycloak, loginWithPopup, resetKeycloak } from "@/lib/keycloak";
import {
  isKeycloakCallback,
  isPopupCallback,
  sendCallbackToOpener,
} from "@/lib/keycloak-callback";
import { PopupBlockedError, PopupClosedError } from "@/lib/keycloak-popup";
import { fetchS3UserDetail, S3UserDetail } from "@/lib/graphql-s3";
import { AuthMode, S3Credentials } from "@/lib/types";
import { ENV } from "@/lib/env";
import {
  clearSession,
  loadAuthMode,
  loadCredentials,
  saveAuthMode,
  saveCredentials,
} from "@/lib/session";
import { AuthError, FullScreenSpinner, NoS3Account } from "@/app/components/auth/AuthScreens";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  mode: AuthMode | null;
  keycloak: Keycloak | null;
  authenticated: boolean;
  token: string | undefined;
  credentials: S3Credentials | null;
  loginWithKeycloak: () => void;
  loginWithCredentials: (creds: S3Credentials) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

type InitState = "loading" | "no-s3-account" | "error" | "ready";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const credentialsFromUserDetail = (detail: S3UserDetail): S3Credentials => ({
  accessKey: detail.accessKey,
  secretKey: detail.secretKey,
  endpoint: ENV.S3_ENDPOINT || "",
  rejectUnauthorized: ENV.CERTIFICATE,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [credentials, setCredentials] = useState<S3Credentials | null>(null);
  const [initState, setInitState] = useState<InitState>("loading");

  // ✅ Ref guard — survives StrictMode double-invoke and Keycloak redirect cycle
  const isInitializedRef = useRef(false);

  // Shared tail of every Keycloak sign-in, popup or redirect alike.
  const completeKeycloakSession = useCallback(async (kc: Keycloak) => {
    // ✅ Only persist the mode once Keycloak has actually granted access, so an
    // abandoned login never leaves a marker that force-redirects later visits.
    if (kc.authenticated) {
      saveAuthMode("keycloak");
    }

    const detail = await fetchS3UserDetail(kc.token);

    setKeycloak(kc);
    setToken(kc.token);
    setMode("keycloak");

    if (!detail) {
      setInitState("no-s3-account");
      return;
    }

    setCredentials(credentialsFromUserDetail(detail));
    setInitState("ready");
  }, []);

  // Redirect sign-in — also how a callback is resumed on page load.
  const startKeycloakSession = useCallback(async () => {
    try {
      await completeKeycloakSession(await initializeKeycloak());
    } catch (error) {
      console.error("Initialization failed:", error);
      setInitState("error");
    }
  }, [completeKeycloakSession]);

  useEffect(() => {
    // ✅ If already initialized (StrictMode second call or redirect back), skip
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // ✅ This window is the sign-in popup: hand the callback back to the opener,
    // which owns the session, and close. Never process the code here.
    if (isPopupCallback()) {
      sendCallbackToOpener();
      return;
    }

    const init = async () => {
      const storedMode = loadAuthMode();

      if (!storedMode) {
        // Back from a redirect sign-in: the callback is in the URL, so resume it
        // even though nothing was stored before we left.
        if (isKeycloakCallback()) {
          await startKeycloakSession();
          return;
        }

        // Otherwise render the login chooser without contacting Keycloak.
        setInitState("ready");
        return;
      }

      if (storedMode === "credentials") {
        const stored = loadCredentials();
        if (!stored) {
          clearSession();
        } else {
          setMode("credentials");
          setCredentials(stored);
        }
        setInitState("ready");
        return;
      }

      await startKeycloakSession();
    };

    init();
  }, [startKeycloakSession]);

  // ✅ Signs in through a popup so this page never navigates away, falling back to
  // a redirect when the browser blocks it.
  const loginWithKeycloak = useCallback(async () => {
    try {
      // The chooser stays visible while the popup is open — no spinner until the
      // user has actually signed in.
      const kc = await loginWithPopup();
      setInitState("loading");
      await completeKeycloakSession(kc);
    } catch (error) {
      if (error instanceof PopupBlockedError) {
        setInitState("loading");
        await startKeycloakSession();
        return;
      }

      // User closed the window — leave them on the chooser, not an error screen.
      if (error instanceof PopupClosedError) {
        return;
      }

      console.error("Keycloak popup sign-in failed:", error);
      setInitState("error");
    }
  }, [completeKeycloakSession, startKeycloakSession]);

  // ✅ Access-key login — no gateway lookup, credentials come straight from the form
  const loginWithCredentials = useCallback((creds: S3Credentials) => {
    saveAuthMode("credentials");
    saveCredentials(creds);
    setMode("credentials");
    setCredentials(creds);
    setInitState("ready");
  }, []);

  const logout = useCallback(() => {
    const previousMode = mode;
    clearSession();

    // Signing out of Keycloak has to leave the site: only Keycloak can end its own
    // session, and that means a real navigation to its logout endpoint. It sends
    // the browser back to the app afterwards.
    if (previousMode === "keycloak" && keycloak) {
      keycloak.logout({ redirectUri: window.location.origin });
      return;
    }

    // Otherwise stay in the app and just navigate home. A reload used to clear
    // these for us, so do it by hand: forget the Keycloak instance, drop the
    // session, and leave the error screens (which is where logout may have been
    // clicked from) so the login page can render.
    resetKeycloak();
    setCredentials(null);
    setMode(null);
    setToken(undefined);
    setKeycloak(null);
    setInitState("ready");
    router.replace("/");
  }, [mode, keycloak, router]);

  // ✅ Re-fetch S3 user detail (Keycloak mode only — key logins have no user detail)
  const refreshAuth = useCallback(async () => {
    if (mode !== "keycloak" || !token) return;
    try {
      const detail = await fetchS3UserDetail(token);
      if (detail) {
        setCredentials(credentialsFromUserDetail(detail));
      }
    } catch (err) {
      console.error("Failed to refresh auth:", err);
    }
  }, [mode, token]);

  const contextValue: AuthContextType = {
    mode,
    keycloak,
    authenticated: credentials !== null,
    credentials,
    token,
    loginWithKeycloak,
    loginWithCredentials,
    logout,
    refreshAuth,
  };

  if (initState === "loading") return <FullScreenSpinner />;
  if (initState === "no-s3-account") return <NoS3Account onLogout={logout} />;
  if (initState === "error") return <AuthError onLogout={logout} />;

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
