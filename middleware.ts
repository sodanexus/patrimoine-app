
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_USER;
  const pass = process.env.BASIC_PASS;
  if (!user || !pass) return NextResponse.next(); // disabled if not set

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
    });
  }
  const b64 = auth.split(" ")[1];
  const [u, p] = Buffer.from(b64, "base64").toString().split(":");
  if (u !== user || p !== pass) return new NextResponse("Forbidden", { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|static|favicon.ico).*)"] };
