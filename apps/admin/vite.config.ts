import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite automatically passes mode depending on the command:
  // vite / npm run dev	 = "development"
  // vite build	= "production"
  // and since the github action does "npm run build" it will be "production" there.
  const isProd = mode === "production";

  return {
    plugins: [react()],

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
      emptyOutDir: true,
      target: "es2020",
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
