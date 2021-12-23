import { defineConfig } from "vite";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8888,
    host: true,
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.join(__dirname, "./src"),
      },
    ],
  },
});
