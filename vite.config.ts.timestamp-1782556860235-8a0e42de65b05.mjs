// vite.config.ts
import { defineConfig } from "file:///Users/madankk/Library/CloudStorage/GoogleDrive-rammadyry8814@gmail.com/My%20Drive/Toolkit_application/toolkit/node_modules/vite/dist/node/index.js";
import react from "file:///Users/madankk/Library/CloudStorage/GoogleDrive-rammadyry8814@gmail.com/My%20Drive/Toolkit_application/toolkit/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///Users/madankk/Library/CloudStorage/GoogleDrive-rammadyry8814@gmail.com/My%20Drive/Toolkit_application/toolkit/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,wasm}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "weather-api", expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
          }
        ]
      },
      manifest: {
        name: "ToolKit",
        short_name: "ToolKit",
        description: "All-in-one utility swiss-army PWA",
        theme_color: "#ff00aa",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait-primary",
        icons: [
          { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      }
    })
  ],
  server: { port: 5173, open: true },
  // ── Vitest configuration ──────────────────────────────────────────────────
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      reporter: ["text", "html"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFkYW5ray9MaWJyYXJ5L0Nsb3VkU3RvcmFnZS9Hb29nbGVEcml2ZS1yYW1tYWR5cnk4ODE0QGdtYWlsLmNvbS9NeSBEcml2ZS9Ub29sa2l0X2FwcGxpY2F0aW9uL3Rvb2xraXRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWRhbmtrL0xpYnJhcnkvQ2xvdWRTdG9yYWdlL0dvb2dsZURyaXZlLXJhbW1hZHlyeTg4MTRAZ21haWwuY29tL015IERyaXZlL1Rvb2xraXRfYXBwbGljYXRpb24vdG9vbGtpdC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFkYW5ray9MaWJyYXJ5L0Nsb3VkU3RvcmFnZS9Hb29nbGVEcml2ZS1yYW1tYWR5cnk4ODE0QGdtYWlsLmNvbS9NeSUyMERyaXZlL1Rvb2xraXRfYXBwbGljYXRpb24vdG9vbGtpdC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd2VicCx3YXNtfSddLFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvYXBpXFwub3BlbndlYXRoZXJtYXBcXC5vcmcvLFxuICAgICAgICAgICAgaGFuZGxlcjogJ1N0YWxlV2hpbGVSZXZhbGlkYXRlJyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnd2VhdGhlci1hcGknLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDUwLCBtYXhBZ2VTZWNvbmRzOiA4NjQwMCB9IH1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnVG9vbEtpdCcsXG4gICAgICAgIHNob3J0X25hbWU6ICdUb29sS2l0JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBbGwtaW4tb25lIHV0aWxpdHkgc3dpc3MtYXJteSBQV0EnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyNmZjAwYWEnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzAwMDAwMCcsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdC1wcmltYXJ5JyxcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7IHNyYzogJy9pY29ucy8xOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICB7IHNyYzogJy9pY29ucy81MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gIF0sXG4gIHNlcnZlcjogeyBwb3J0OiA1MTczLCBvcGVuOiB0cnVlIH0sXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFZpdGVzdCBjb25maWd1cmF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogICAgIHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogIFsnLi9zcmMvX190ZXN0c19fL3NldHVwLnRzJ10sXG4gICAgaW5jbHVkZTogICAgIFsnc3JjLyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH0nXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICAndjgnLFxuICAgICAgaW5jbHVkZTogICBbJ3NyYy9saWIvKionXSxcbiAgICAgIHJlcG9ydGVyOiAgWyd0ZXh0JywgJ2h0bWwnXVxuICAgIH1cbiAgfVxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQXdmLFNBQVMsb0JBQW9CO0FBQ3JoQixPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQywwQ0FBMEM7QUFBQSxRQUN6RCxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyxlQUFlLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxNQUFNLEVBQUU7QUFBQSxVQUM1RjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxhQUFhO0FBQUEsUUFDYixPQUFPO0FBQUEsVUFDTCxFQUFFLEtBQUssa0JBQWtCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUM3RCxFQUFFLEtBQUssa0JBQWtCLE9BQU8sV0FBVyxNQUFNLGFBQWEsU0FBUyxlQUFlO0FBQUEsUUFDeEY7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUSxFQUFFLE1BQU0sTUFBTSxNQUFNLEtBQUs7QUFBQTtBQUFBLEVBR2pDLE1BQU07QUFBQSxJQUNKLFNBQWE7QUFBQSxJQUNiLGFBQWE7QUFBQSxJQUNiLFlBQWEsQ0FBQywwQkFBMEI7QUFBQSxJQUN4QyxTQUFhLENBQUMsK0JBQStCO0FBQUEsSUFDN0MsVUFBVTtBQUFBLE1BQ1IsVUFBVztBQUFBLE1BQ1gsU0FBVyxDQUFDLFlBQVk7QUFBQSxNQUN4QixVQUFXLENBQUMsUUFBUSxNQUFNO0FBQUEsSUFDNUI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
