const host = typeof window !== "undefined" ? window.location.hostname : "";
const port = typeof window !== "undefined" ? window.location.port : "";
const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";

// Stage docker mapping:
// - demo web is on :81
// - API is on :82
// Examples:
// - http://185.188.115.35:81/  -> http://185.188.115.35:82/
// - http://localhost:81/       -> http://localhost:82/
const isStageWebOn81 = port === "81";

const stageApiUrl = (() => {
  if (!isStageWebOn81) return null;

  // Use the same host but switch port to 82.
  // Works for both direct IP and localhost.
  return `${protocol}//${host}:82`;
})();

export const API_URL = stageApiUrl || import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Light map tiles for better visibility (Voyager style) */
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';