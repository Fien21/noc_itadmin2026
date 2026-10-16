import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { key, deviceId } = await request.json();
    
    if (!key) {
      return NextResponse.json({ valid: false, error: 'License key is required' }, { status: 400, headers: corsHeaders });
    }

    const hashedIncomingKey = crypto.createHash('sha256').update(key).digest('hex');

    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { key: key },
          { hashedKey: hashedIncomingKey }
        ]
      }
    });

    if (!client) {
      return NextResponse.json({ valid: false, error: 'Invalid license key' }, { status: 404, headers: corsHeaders });
    }

    if (client.status === 'revoked') {
      return NextResponse.json({ valid: false, error: 'License has been permanently revoked' }, { status: 403, headers: corsHeaders });
    }

    if (client.status === 'locked_down') {
      return NextResponse.json({ valid: false, error: 'System is currently under Administrative Lockdown / Maintenance Mode.' }, { status: 423, headers: corsHeaders });
    }

    const today = new Date();
    if (client.expires && today > new Date(client.expires)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'License expired', 
        client: { name: client.name, branch: client.branch } 
      }, { status: 403, headers: corsHeaders });
    }

    if (client.status !== 'active') {
      return NextResponse.json({ valid: false, error: `License is ${client.status}` }, { status: 403, headers: corsHeaders });
    }

    return NextResponse.json({
      valid: true,
      message: 'License verified successfully',
      client: {
        name: client.name,
        branch: client.branch,
        maxDevices: client.maxDevices,
        expires: client.expires
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in verify-license:', error);
    return NextResponse.json({ valid: false, error: 'Server error verifying license' }, { status: 500, headers: corsHeaders });
  }
}
