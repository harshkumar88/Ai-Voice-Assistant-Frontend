import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // server: {
  //   proxy: {
  //     "https://ai-voice-assistant-frontend.onrender.com/bot":
  //       "https://ai-voice-assistant-backend-072o.onrender.com/", // Proxy ALL requests starting with /bot to backend
  //   },
  // },
});
