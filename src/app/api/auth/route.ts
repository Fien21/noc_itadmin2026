import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SECURE_TOKEN_VALUE = 'system-it-secure-session-token-v1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'itadmin123'; // In production, move this to .env

export async function POST(request: Request) {
  try {
    const { action, password } = await request.json();

    const cookieStore = await cookies();

    if (action === 'login') {
      if (password === ADMIN_PASSWORD) {
        // Set HTTP-Only Secure Cookie (cannot be accessed by JS or injected easily)
        cookieStore.set('auth_token', SECURE_TOKEN_VALUE, {
          httpOnly: true,
          secure: false,
          path: '/',
          maxAge: 60 * 60 * 24
        });
        
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
      }
    }

    if (action === 'logout') {
      cookieStore.delete('auth_token');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');
  
  if (token && token.value === SECURE_TOKEN_VALUE) {
    return NextResponse.json({ authenticated: true });
  }
  
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
