import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function normalizeTarget(value: string | undefined) {
  const normalized = (value ?? "").trim().replace(/\/+$/, "");
  return normalized || "http://localhost:8080";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = normalizeTarget(
    env.VITE_API_PROXY_TARGET
    || env.VITE_API_BASE_URL
    || env.BACKEND_URL
    || env.APP_BACKEND_URL
  );

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
