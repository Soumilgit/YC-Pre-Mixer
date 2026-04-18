import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard"];
const PROTECTED_API = ["/api/generate", "/api/validate", "/api/history"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedApi = PROTECTED_API.some((r) => pathname.startsWith(r));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const result = createMiddlewareClient(request);

  if (!result) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
    }
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const { supabase, response } = result;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated — return the response which already carries cookie updates
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/generate/:path*", "/api/validate/:path*", "/api/history/:path*"],
};
