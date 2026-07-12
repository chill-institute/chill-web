const assetCacheControl = "public, max-age=31536000, immutable";
const assetMissCacheControl = "public, max-age=0, must-revalidate";
const htmlContentTypePattern = /\btext\/html\b/i;

type StaticAssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

export type StaticAssetEnv = {
  ASSETS: StaticAssetsBinding;
};

function isAssetPath(pathname: string) {
  return pathname === "/assets" || pathname.startsWith("/assets/");
}

function isHtmlResponse(response: Response) {
  return htmlContentTypePattern.test(response.headers.get("content-type") ?? "");
}

function createAssetMissResponse() {
  return new Response("Not found\n", {
    status: 404,
    headers: {
      "Cache-Control": assetMissCacheControl,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function withAssetHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", assetCacheControl);
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function withHtmlSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleStaticAssetRequest(request: Request, env: StaticAssetEnv) {
  const url = new URL(request.url);
  const response = await env.ASSETS.fetch(request);

  if (!isAssetPath(url.pathname)) {
    if (response.ok && isHtmlResponse(response)) {
      return withHtmlSecurityHeaders(response);
    }
    return response;
  }

  if (response.ok && isHtmlResponse(response)) {
    return createAssetMissResponse();
  }

  if (response.ok) {
    return withAssetHeaders(response);
  }

  return response;
}

export default {
  fetch: handleStaticAssetRequest,
};
