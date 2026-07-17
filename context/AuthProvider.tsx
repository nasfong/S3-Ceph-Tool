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
import {
  forwardCallbackToOpener,
  initializeKeycloak,
  isKeycloakCallback,
  isPopupCallback,
  loginWithPopup,
  PopupBlockedError,
  PopupClosedError,
} from "@/lib/keycloak";
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

// ─── UI Components ────────────────────────────────────────────────────────────

const FullScreenSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4" />
      <p className="text-gray-400">Initializing, please wait...</p>
    </div>
  </div>
);

const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <button
    onClick={onLogout}
    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
  >
    Logout
  </button>
);

const NoS3Account = ({ onLogout }: { onLogout: () => void }) => (
  <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
    <div className="text-center space-y-3">
      <div className="text-4xl">⚠️</div>
      <p className="text-white text-lg font-semibold">No S3 account found</p>
      <p className="text-gray-400 text-sm">
        Your account does not have an S3 storage account associated with it.
        <br />
        Please subscribe to S3 on Cloud-Dash to gain access.
      </p>
      <LogoutButton onLogout={onLogout} />
    </div>
  </div>
);

const AuthError = ({ onLogout }: { onLogout: () => void }) => (
  <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
    <div className="text-center space-y-3">
      <div className="text-4xl">❌</div>
      <p className="text-white text-lg font-semibold">Authentication failed</p>
      <p className="text-gray-400 text-sm">
        Failed to initialize. Please refresh or try logging out.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Refresh
        </button>
        <LogoutButton onLogout={onLogout} />
      </div>
    </div>
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const credentialsFromUserDetail = (detail: S3UserDetail): S3Credentials => ({
  accessKey: detail.accessKey,
  secretKey: detail.secretKey,
  endpoint: ENV.S3_ENDPOINT || "",
  rejectUnauthorized: ENV.CERTIFICATE,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [credentials, setCredentials] = useState<S3Credentials | null>(null);
  const [initState, setInitState] = useState<InitState>("loading");

  // ✅ Ref guard — survives StrictMode double-invoke and Keycloak redirect cycle
  const isInitializedRef = useRef(false);

  // Starts (or resumes) a Keycloak session. On a fresh login this redirects away
  // and never resolves; on the trip back it consumes the callback in the URL.
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
      forwardCallbackToOpener();
      return;
    }

    const init = async () => {
      const storedMode = loadAuthMode();

      if (!storedMode) {
        // Returning from Keycloak: the callback is in the URL, so resume the login
        // even though nothing was stored before we redirected away.
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

  // ✅ Signs in through a popup so this page never navigates away. Falls back to a
  // full-page redirect when the browser blocks the popup. Nothing is persisted
  // until Keycloak grants access.
  const loginWithKeycloak = useCallback(async () => {
    try {
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
    setCredentials(null);
    setMode(null);

    if (previousMode === "keycloak" && keycloak) {
      keycloak.logout({ redirectUri: window.location.origin });
      return;
    }

    // Full reload also resets the module-level Keycloak singleton
    window.location.href = "/";
  }, [mode, keycloak]);

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
