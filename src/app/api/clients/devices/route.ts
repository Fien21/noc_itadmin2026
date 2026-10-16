import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { licenseKey, deviceId, userAgent, action } = await request.json();
    
    if (!licenseKey || !action) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { key: licenseKey }
    });
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 404 });
    }
    
    let devices = Array.isArray(client.devices) ? [...(client.devices as any[])] : [];

    if (action === 'register') {
      if (!devices.find((d: any) => d.id === deviceId)) {
        devices.push({
          id: deviceId,
          userAgent: userAgent || 'Unknown',
          createdAt: new Date().toISOString()
        });
      }
    } else if (action === 'revoke') {
      devices = devices.filter((d: any) => d.id !== deviceId);
    } else if (action === 'revoke_all') {
      devices = [];
    }

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: { devices: devices }
    });

    return NextResponse.json({ success: true, devices: updated.devices });
  } catch (error) {
    console.error('Error in devices route:', error);
    return NextResponse.json({ success: false, error: 'Failed to process device action' }, { status: 500 });
  }
}
