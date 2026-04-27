import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = new Set(['/login', '/logout'])
const COOKIE_CANDIDATES = ['access_token', 'refresh_token', 'accessToken', 'refreshToken']

function hasAuthCookie(req: NextRequest): boolean {
  if (COOKIE_CANDIDATES.some((cookieName) => Boolean(req.cookies.get(cookieName)?.value))) {
    return true
  }

  const cookieHeader = req.headers.get('cookie') ?? ''
  return COOKIE_CANDIDATES.some((cookieName) => cookieHeader.includes(`${cookieName}=`))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  if (!hasAuthCookie(req)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|logo|navigate).*)',
  ],
}
