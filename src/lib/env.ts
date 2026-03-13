const trim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function getPublicAPIBaseURL() {
  const value = trim(import.meta.env.VITE_PUBLIC_API_BASE_URL);
  if (value) {
    return value;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8080";
    }
    return window.location.origin;
  }

  return "http://localhost:8080";
}
