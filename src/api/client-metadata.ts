const clientNameHeader = "X-Chill-Client";
const clientVersionHeader = "X-Chill-Client-Version";

export function setClientMetadata(headers: Headers, release: string | undefined): void {
  headers.set(clientNameHeader, "web");
  headers.set(clientVersionHeader, release?.trim() || "unknown");
}
