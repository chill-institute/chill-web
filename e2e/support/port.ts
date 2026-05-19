export function playwrightPort(defaultPort: number): number {
  const raw = process.env.PLAYWRIGHT_PORT;
  if (raw === undefined || raw === "") {
    return defaultPort;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PLAYWRIGHT_PORT must be an integer from 1 to 65535, got ${raw}`);
  }

  return port;
}
