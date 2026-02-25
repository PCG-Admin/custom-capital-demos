// No Next.js imports — the next/server barrel eagerly loads ua-parser-js
// which uses __dirname, crashing Vercel's Edge Runtime.
// All Web APIs (Request, Response, URL) are native globals in Edge Runtime.

const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/logout',
  '/favicon.ico',
  '/icon.svg',
  '/apple-icon.png',
  '/contact',
  '/reset-password',
]

export function middleware(request: Request) {
  try {
    const { pathname } = new URL(request.url)

    // Allow public static assets
    const isPublicAsset =
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/public/') ||
      /\.(png|jpg|jpeg|gif|svg|ico|pdf|webp)$/.test(pathname)

    if (isPublicAsset) return

    // Check if path is in public paths list
    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )

    if (isPublic) return

    // Check for session cookie
    const cookieHeader = request.headers.get('cookie') ?? ''
    const hasSession = cookieHeader.split(';').some(
      (c) => c.trim().startsWith('cc_session=')
    )

    if (!hasSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return Response.redirect(loginUrl, 307)
    }
  } catch (error) {
    console.error('Middleware error:', error)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
