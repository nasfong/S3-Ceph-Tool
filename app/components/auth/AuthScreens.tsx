"use client";

/** Full-screen states the AuthProvider shows instead of the app. */

export const FullScreenSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4" />
      <p className="text-gray-400">Loading...</p>
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

export const NoS3Account = ({ onLogout }: { onLogout: () => void }) => (
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

export const AuthError = ({ onLogout }: { onLogout: () => void }) => (
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
