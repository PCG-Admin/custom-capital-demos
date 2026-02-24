import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout', '/favicon.ico']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const isNextStatic = pathname.startsWith('/_next') || pathname.startsWith('/api/auth')

  if (isPublic || isNextStatic) {
    return NextResponse.next()
  }

  const session = request.cookies.get('cc_session')

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|public).*)'],
}
