import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { authStore } from "@/utils/auth.store";
import { authService } from "@/services/auth.service";

export function ProtectedRoute() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Already have an access token in memory — good to go
      if (authStore.getAccessToken()) {
        setReady(true);
        return;
      }

      // Have a refresh token but no access token (e.g. page refresh) — restore session
      if (authStore.getRefreshToken()) {
        try {
          await authService.refresh();
          setReady(true);
        } catch {
          authStore.clear();
          navigate("/login", { replace: true });
        }
        return;
      }

      // No tokens at all — redirect to login
      navigate("/login", { replace: true });
    };

    init();
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}
