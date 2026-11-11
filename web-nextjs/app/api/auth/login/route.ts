import { NextRequest } from "next/server";
import { forwardRequest } from "@/app/api/proxyHelper";

export async function POST(request: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  return forwardRequest(request, `${apiBaseUrl}/login`);
}
