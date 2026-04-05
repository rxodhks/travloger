import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), ["VITE_", "SUPABASE_"]);
  const merged = { ...fileEnv, ...process.env } as Record<string, string | undefined>;
  const resolvedSupabaseUrl = (
    merged.VITE_SUPABASE_URL ||
    merged.SUPABASE_URL ||
    ""
  ).trim();
  const resolvedSupabasePublishable = (
    merged.VITE_SUPABASE_PUBLISHABLE_KEY ||
    merged.SUPABASE_PUBLISHABLE_KEY ||
    merged.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: process.env.VERCEL_DEV_API_URL || "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 지도·차트 등으로 메인 청크가 500kB를 넘음; Vercel 로그 경고만 완화 (필요 시 추후 lazy load로 분리)
    chunkSizeWarningLimit: 1000,
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(resolvedSupabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      resolvedSupabasePublishable
    ),
  },
};
});
