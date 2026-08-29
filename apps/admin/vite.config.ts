import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // load .env environment file from root folder
  const env = loadEnv(mode, path.resolve(import.meta.dirname, "../.."), "");

  // Vite automatically passes mode depending on the command:
  // vite / npm run dev	 = "development"
  // vite build	= "production"
  // and since the github action does "npm run build" it will be "production" there.
  const isProd = mode === "production";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.API_URL": JSON.stringify(env.API_URL),
    },
    publicDir: isProd ? false : "../../public/admin",
    base: isProd ? "/map/admin/" : "/admin/",
    server: {
      proxy: {
        // everything NOT /admin goes to map
        "^/(?!admin)": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "../../public/admin", // IMPORTANT
      emptyOutDir: false,
      target: "es2020",
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    }
  }

});
