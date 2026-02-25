import type { NextRequest } from 'next/dist/server/web/spec-extension/request'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'

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

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Allow public static assets
    const isPublicAsset =
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/public/') ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|pdf|webp)$/)

    if (isPublicAsset) {
      return NextResponse.next()
    }

    // Check if path is in public paths list
    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )

    if (isPublic) {
      return NextResponse.next()
    }

    // Check for session cookie
    const session = request.cookies.get('cc_session')

    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  } catch (error) {
    // Log error and allow request to continue to avoid blocking the entire app
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
