import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, "../..", "");
  if (command === "build" && environment.VITE_UI_PREVIEW === "true") {
    throw new Error("VITE_UI_PREVIEW is development-only and cannot be enabled for a production build");
  }

  return {
    base: environment.VITE_BASE_PATH?.trim() || "/",
    envDir: "../..",
    plugins: [react(), tailwindcss()],
    publicDir: "../../assets",
    server: {
      host: "127.0.0.1",
      port: 5173,
    },
  };
});
