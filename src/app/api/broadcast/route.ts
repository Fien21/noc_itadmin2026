import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SECURE_TOKEN_VALUE = 'system-it-secure-session-token-v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Clients call this to see if there's a global message
export async function GET() {
  try {
    const broadcast = await prisma.broadcast.findFirst();
    if (broadcast) {
      return NextResponse.json(
        { active: broadcast.active, message: broadcast.message, type: broadcast.type },
        { headers: corsHeaders }
      );
    }
    return NextResponse.json({ active: false, message: '', type: 'info' }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ active: false, message: '', type: 'info' }, { headers: corsHeaders });
  }
}

// IT Admin calls this to set the global message
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('auth_token')?.value !== SECURE_TOKEN_VALUE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const existing = await prisma.broadcast.findFirst();
    if (existing) {
      await prisma.broadcast.update({
        where: { id: existing.id },
        data: {
          active: !!body.active,
          message: body.message || '',
          type: body.type || 'info',
        },
      });
    } else {
      await prisma.broadcast.create({
        data: {
          active: !!body.active,
          message: body.message || '',
          type: body.type || 'info',
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update broadcast' }, { status: 500 });
  }
}
