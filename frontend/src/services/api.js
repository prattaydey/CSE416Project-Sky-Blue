const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const APP_CLIENT_KEY = import.meta.env.VITE_APP_CLIENT_KEY || "";

function getAuthHeaders() {
  if (!APP_CLIENT_KEY) {
    throw new Error("Missing VITE_APP_CLIENT_KEY in frontend .env");
  }

  return {
    Authorization: `Bearer ${APP_CLIENT_KEY}`,
  };
}

export async function fetchPlayers() {
  const res = await fetch(`${BACKEND_URL}/api/players`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized — check your API key.");
    }
    throw new Error(`Server error (${res.status})`);
  }

  return res.json();
}

export async function fetchPlayer(playerId) {
  const res = await fetch(`${BACKEND_URL}/api/players/${encodeURIComponent(playerId)}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized — check your API key.");
    }
    throw new Error(`Server error (${res.status})`);
  }

  return res.json();
}
