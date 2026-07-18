/**
 * FILE: /lib/offlineStrategy.ts
 */

import { toolsRegistry } from "./toolsRegistry";

export type OfflineStatus = {
  isOnline: boolean;
  cachedTools: string[];
  staleCacheItems: string[];
};

export async function registerServiceWorker(): Promise<void> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Service worker registration failed with ${error}`);
    }
  }
}

export async function getOfflineStatus(): Promise<OfflineStatus> {
  const isOnline = navigator.onLine;
  const cachedTools: string[] = [];
  const staleCacheItems: string[] = [];

  // Logic to determine which tools are fully cached
  // This is a simplified check against the tool-ui-cache
  const uiCache = await caches.open("tool-ui-cache");
  const keys = await uiCache.keys();
  
  toolsRegistry.forEach(tool => {
    const isCached = keys.some(k => k.url.includes(tool.route));
    if (isCached) cachedTools.push(tool.id);
  });

  return {
    isOnline,
    cachedTools,
    staleCacheItems
  };
}

/**
 * Provides offline-safe behavior or fallback information for a tool.
 */
export function offlineFallback(toolId: string) {
  const tool = toolsRegistry.find(t => t.id === toolId);
  if (!tool) return null;

  if (tool.offlineCapable) {
    return {
      status: "available",
      message: "Tool is fully functional offline."
    };
  }

  // Handle specific semi-offline tools
  if (toolId === "weather" || toolId === "currencyConverter") {
    return {
      status: "stale",
      message: "Showing cached data. Connect to internet for live updates."
    };
  }

  return {
    status: "unavailable",
    message: "This tool requires an active internet connection."
  };
}
