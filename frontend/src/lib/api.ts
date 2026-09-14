const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, "");

type CsrfResponse = {
  token: string;
  headerName: string;
};

let csrfTokenPromise: Promise<CsrfResponse> | null = null;

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(`${API_BASE_URL}/api/v1/auth/csrf`, {
      credentials: "include",
    }).then(async (response) => {
      if (!response.ok) throw new Error("Could not initialize request security.");
      return response.json() as Promise<CsrfResponse>;
    }).catch((error) => {
      csrfTokenPromise = null;
      throw error;
    });
  }

  return csrfTokenPromise;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!new Set(["GET", "HEAD", "OPTIONS"]).has(method)) {
    const csrf = await getCsrfToken();
    headers.set(csrf.headerName, csrf.token);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

export function clearCsrfToken() {
  csrfTokenPromise = null;
}
