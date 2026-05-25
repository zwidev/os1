import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// Check if SSL certs exist for mobile access
const certPath = path.resolve(__dirname, "certs/localhost+3.pem");
const keyPath = path.resolve(__dirname, "certs/localhost+3-key.pem");
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
  },
  server: {
    host: true,
    ...(hasSSL
      ? {
          https: {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          },
        }
      : {}),
  },
});
