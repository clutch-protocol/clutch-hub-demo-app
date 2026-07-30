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

/**
 * This chain's id — pinned client-side (never sourced from the hub) for the chain-bound auth
 * challenge and as the `signTransaction` verification pin. See `ClutchHubSdk` constructor docs.
 */
const viteChainId = import.meta.env.VITE_CHAIN_ID;
export const CHAIN_ID =
  typeof viteChainId === "string" && viteChainId.trim().length > 0
    ? Number(viteChainId)
    : 2077;

/** Hub API base without trailing slash */
export const HUB_API_BASE_URL = API_URL.replace(/\/$/, "");

export const HUB_HEALTH_URL = `${HUB_API_BASE_URL}/health`;
export const HUB_GRAPHQL_HTTP_URL = `${HUB_API_BASE_URL}/graphql`;

/** Browser GraphQL subscriptions use this WebSocket URL (same host as Hub, `/graphql/ws`). */
export const HUB_GRAPHQL_WS_URL = (() => {
  try {
    const u = new URL(HUB_API_BASE_URL);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/graphql/ws";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
})();

/**
 * Optional comma-separated list of node RPC/WebSocket URLs to show on the General tab
 * (e.g. stage operator). Not required for the app to run; the Hub talks to nodes server-side.
 */
const viteNodeEndpoints = import.meta.env.VITE_PUBLIC_NODE_ENDPOINTS;
export const PUBLIC_NODE_ENDPOINTS =
  typeof viteNodeEndpoints === "string" && viteNodeEndpoints.trim().length > 0
    ? viteNodeEndpoints
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/** Light map tiles for better visibility (Voyager style) */
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Dark map tiles for the dark theme (CARTO Dark Matter) */
export const MAP_TILE_URL_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const getMapTileUrl = (theme) => (theme === "dark" ? MAP_TILE_URL_DARK : MAP_TILE_URL);
