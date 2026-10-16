import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { licenseKey, metrics } = await request.json();
    if (!licenseKey) return NextResponse.json({ success: false });

    const client = await prisma.client.findFirst({
      where: { key: licenseKey }
    });
    
    if (!client) {
      return NextResponse.json({ success: false });
    }
    
    if (metrics) {
      await prisma.client.update({
        where: { id: client.id },
        data: { metrics }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      status: client.status,
      expires: client.expires,
      maxDevices: client.maxDevices || 1
    });
  } catch (error) {
    console.error('Error in sync route:', error);
    return NextResponse.json({ success: false });
  }
}
