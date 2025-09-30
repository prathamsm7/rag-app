import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Define protected routes (exclude auth routes)
  const protectedRoutes = ["/"]
  const isProtectedRoute = protectedRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  )

  // Define protected API routes that require authentication
  const protectedApiRoutes = ["/api/index", "/api/chat", "/api/user-data"]
  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  )

  // Define auth routes (login, signup, etc.)
  const authRoutes = ["/auth/signin", "/auth/signup", "/auth/error"]
  const isAuthRoute = authRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  )

  // Don't redirect if already on auth route
  if (isAuthRoute) {
    return NextResponse.next()
  }

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl))
  }

  // Return 401 for protected API routes without auth
  if (isProtectedApiRoute && !isLoggedIn) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (auth API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
  runtime: 'nodejs', // Force Node.js runtime instead of edge
}

