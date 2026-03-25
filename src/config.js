const host = typeof window !== "undefined" ? window.location.hostname : "";
const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";

const stageApiUrl =
  host === "stageweb.clutchprotocol.io"
    ? `${protocol}//stageapi.clutchprotocol.io`
    : null;

export const API_URL =
  stageApiUrl || import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Light map tiles for better visibility (Voyager style) */
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';