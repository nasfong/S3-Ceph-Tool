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
import { initializeKeycloak } from "@/lib/keycloak";
import { fetchS3UserDetail, S3UserDetail } from "@/lib/graphql-s3";
import { S3Credentials } from "@/lib/types";
import { ENV } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  // Keycloak auth
  keycloak: Keycloak | null;
  authenticated: boolean;
  token: string | undefined;
  credentials: S3Credentials;
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

const LogoutButton = ({ keycloak }: { keycloak: Keycloak | null }) => (
  <button
    onClick={() => keycloak?.logout({ redirectUri: window.location.origin })}
    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
  >
    Logout
  </button>
);

const NoS3Account = ({ keycloak }: { keycloak: Keycloak | null }) => (
  <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
    <div className="text-center space-y-3">
      <div className="text-4xl">⚠️</div>
      <p className="text-white text-lg font-semibold">No S3 account found</p>
      <p className="text-gray-400 text-sm">
        Your account does not have an S3 storage account associated with it.
        <br />
        Please subscribe to S3 on Cloud-Dash to gain access.
      </p>
      <LogoutButton keycloak={keycloak} />
    </div>
  </div>
);

const AuthError = ({ keycloak }: { keycloak: Keycloak | null }) => (
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
        <LogoutButton keycloak={keycloak} />
      </div>
    </div>
  </div>
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Keycloak state
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<S3UserDetail | null>(null);
  const [initState, setInitState] = useState<InitState>("loading");

  // ✅ Ref guard — survives StrictMode double-invoke and Keycloak redirect cycle
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // ✅ If already initialized (StrictMode second call or redirect back), skip
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      try {
        const kc = await initializeKeycloak();
        const detail = await fetchS3UserDetail(kc.token);

        setKeycloak(kc);
        setAuthenticated(kc.authenticated ?? false);
        setToken(kc.token);

        if (!detail) {
          setInitState("no-s3-account");
          return;
        }

        setUser(detail);
        setInitState("ready");
      } catch (error) {
        console.error("Initialization failed:", error);
        setInitState("error");
      }
    };

    init();
  }, []);


  // ✅ Logout method
  const logout = useCallback(() => {
    keycloak?.logout({ redirectUri: window.location.origin });
  }, [keycloak]);

  // ✅ Refresh auth (re-fetch S3 user detail if token exists)
  const refreshAuth = useCallback(async () => {
    if (!token) return;
    try {
      const detail = await fetchS3UserDetail(token);
      if (detail) {
        setUser(detail);
      }
    } catch (err) {
      console.error("Failed to refresh auth:", err);
    }
  }, [token]);

  const contextValue: AuthContextType = {
    keycloak,
    authenticated,
    credentials: {
      accessKey: user?.accessKey || "",
      secretKey: user?.secretKey || "",
      endpoint: ENV.S3_ENDPOINT || "",
      rejectUnauthorized: ENV.CERTIFICATE,
    },
    token,
    logout,
    refreshAuth,
  };

  if (initState === "loading") return <FullScreenSpinner />;
  if (initState === "no-s3-account") return <NoS3Account keycloak={keycloak} />;
  if (initState === "error") return <AuthError keycloak={keycloak} />;

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