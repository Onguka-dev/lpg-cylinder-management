import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, defaultRouteByRole } from "@/lib/rbac";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-core";

const publicPaths = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/starter-data"
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  if (!session && pathname !== "/login") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL(defaultRouteByRole[session.user.role], request.url));
  }

  if (!session) {
    return NextResponse.next();
  }

  if (pathname === "/unauthorized") {
    return NextResponse.next();
  }

  if (!canAccessPath(session.user.role, pathname)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
