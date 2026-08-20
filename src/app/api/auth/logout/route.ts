import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    // Clear the next-auth session cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')
      || request.cookies.get('__Secure-next-auth.session-token');

    if (sessionCookie) {
      response.cookies.delete(sessionCookie.name);
    }

    return response;
  } catch {
    return NextResponse.json({ success: true });
  }
}
