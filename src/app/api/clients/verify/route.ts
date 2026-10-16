import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { licenseKey } = await request.json();
    
    if (!licenseKey) {
      return NextResponse.json({ success: false, error: 'License key is required' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { key: licenseKey }
    });
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 404 });
    }
    
    if (client.status !== 'active') {
      return NextResponse.json({ success: false, error: `License is ${client.status}` }, { status: 403 });
    }
    
    if (client.expires && new Date() > new Date(client.expires)) {
      return NextResponse.json({ success: false, error: 'License has expired' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      client: {
        id: client.id,
        name: client.name,
        systemType: client.systemType,
        branch: client.branch,
        contactNumber: client.contactNumber,
        lat: client.lat,
        lng: client.lng,
        expires: client.expires,
        maxDevices: client.maxDevices || 1
      }
    });
  } catch (error) {
    console.error('Error verifying client license:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify license' }, { status: 500 });
  }
}
