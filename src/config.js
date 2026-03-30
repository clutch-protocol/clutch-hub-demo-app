const host = typeof window !== "undefined" ? window.location.hostname : "";
const port = typeof window !== "undefined" ? window.location.port : "";
const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";

// Cloudflare / split hostnames:
// - app on app-stage.<domain>
// - API on api-stage.<domain>
const cloudflareStageApiUrl = (() => {
  if (host.startsWith("app-stage.")) {
    const apiHost = host.replace(/^app-stage\./, "api-stage.");
    return `${protocol}//${apiHost}`;
  }

  // Backwards compatibility (older deployments)
  if (host.startsWith("stageweb.")) {
    const apiHost = host.replace(/^stageweb\./, "stageapi.");
    return `${protocol}//${apiHost}`;
  }

  return null;
})();

// Legacy docker mapping: demo on :81, API on :82 (same host).
// e.g. http://localhost:81/ -> http://localhost:82/
const isStageWebOn81 = port === "81";
const legacyPort81ApiUrl = (() => {
  if (!isStageWebOn81) return null;
  return `${protocol}//${host}:82`;
})();

const viteApi = import.meta.env.VITE_API_URL;

export const API_URL =
  cloudflareStageApiUrl ||
  legacyPort81ApiUrl ||
  (typeof viteApi === "string" && viteApi.length > 0 ? viteApi : null) ||
  "http://localhost:3000";

/** Light map tiles for better visibility (Voyager style) */
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
