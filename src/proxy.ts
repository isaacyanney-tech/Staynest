import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on each request and sends signed-out
// visitors away from private areas. This is an optimistic check only: every
// dashboard page and server action re-checks the role on the server, and RLS
// enforces it again in the database.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } catch {
    signedIn = false;
  }

  const { pathname, search } = request.nextUrl;
  const isAdminArea = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isDashboard = pathname.startsWith("/dashboard");
  if (!signedIn && (isAdminArea || isDashboard)) {
    const target = request.nextUrl.clone();
    target.pathname = isAdminArea ? "/admin/login" : "/sign-in";
    target.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(target);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
