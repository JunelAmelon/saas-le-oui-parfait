import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getRoleFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get('user_role')?.value;
  return cookie || null;
}

const PLANNER_ROUTES = [
  '/admin',
  '/agence',
  '/contrats',
  '/devis',
  '/documents',
  '/evenements',
  '/factures',
  '/fleurs',
  '/messages',
  '/planning',
  '/prestataires',
  '/profile',
  '/prospects',
  '/settings',
  '/statistiques',
  '/stock',
  '/notifications',
];

const CLIENT_ROUTES = ['/espace-client'];
const VENDOR_ROUTES = ['/espace-pro'];
const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password', '/cgu', '/confidentialite'];

function isPlannerRoute(path: string): boolean {
  return PLANNER_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
}

function isClientRoute(path: string): boolean {
  return CLIENT_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
}

function isVendorRoute(path: string): boolean {
  return VENDOR_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
}

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = getRoleFromCookie(req);

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    return NextResponse.next();
  }

  // If no role cookie, redirect to login for protected routes
  if (!role) {
    // Allow root page (will be handled client-side)
    if (pathname === '/') return NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Check access based on role
  if (isPlannerRoute(pathname) && role !== 'planner' && role !== 'admin') {
    // Redirect to the user's space
    if (role === 'client') return NextResponse.redirect(new URL('/espace-client', req.url));
    if (role === 'vendor') return NextResponse.redirect(new URL('/espace-pro', req.url));
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isClientRoute(pathname) && role !== 'client') {
    if (role === 'planner' || role === 'admin') return NextResponse.redirect(new URL('/', req.url));
    if (role === 'vendor') return NextResponse.redirect(new URL('/espace-pro', req.url));
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isVendorRoute(pathname) && role !== 'vendor') {
    if (role === 'planner' || role === 'admin') return NextResponse.redirect(new URL('/', req.url));
    if (role === 'client') return NextResponse.redirect(new URL('/espace-client', req.url));
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
