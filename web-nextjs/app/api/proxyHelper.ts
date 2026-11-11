import { NextRequest, NextResponse } from "next/server";

export async function forwardRequest(request: NextRequest, targetUrl: string) {
  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey !== "host" &&
      lowerKey !== "connection" &&
      lowerKey !== "content-length"
    ) {
      headers.set(key, value);
    }
  }

  let body: ArrayBuffer | undefined = undefined;
  if (hasBody) {
    try {
      body = await request.arrayBuffer();
    } catch {
      body = undefined;
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    for (const [key, value] of res.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "content-encoding" &&
        lowerKey !== "transfer-encoding"
      ) {
        responseHeaders.set(key, value);
      }
    }

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody.byteLength > 0 ? resBody : null, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Failed to proxy request to ${targetUrl}:`, error);
    return NextResponse.json(
      { error: "Error de conexión con el servicio backend" },
      { status: 502 }
    );
  }
}
