import { NextRequest } from "next/server";
import { forwardRequest } from "@/app/api/proxyHelper";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const search = request.nextUrl.search;
  const targetUrl = `${apiBaseUrl}/api/${path.join("/")}${search}`;
  return forwardRequest(request, targetUrl);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
  handler as HEAD,
};
