import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SECURE_TOKEN_VALUE = 'system-it-secure-session-token-v1';

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('auth_token')?.value !== SECURE_TOKEN_VALUE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json([]);
  }
}

function calculateExpiry(length: string, customDate?: string) {
  const date = new Date();
  if (length === 'custom' && customDate) {
    return new Date(customDate);
  }
  
  switch(length) {
    case '1_day': date.setDate(date.getDate() + 1); break;
    case '3_days': date.setDate(date.getDate() + 3); break;
    case '7_days': date.setDate(date.getDate() + 7); break;
    case '1_month': date.setMonth(date.getMonth() + 1); break;
    case '3_months': date.setMonth(date.getMonth() + 3); break;
    case '7_months': date.setMonth(date.getMonth() + 7); break;
    case '1_year': date.setFullYear(date.getFullYear() + 1); break;
    case '2_years': date.setFullYear(date.getFullYear() + 2); break;
    default: date.setFullYear(date.getFullYear() + 1); break;
  }
  return date;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('auth_token')?.value !== SECURE_TOKEN_VALUE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, organization, company, branch, contactNumber, maxDevices, lat, lng, systemType, generateKey, subscriptionLength, customDate } = await request.json();
    
    let rawKey = '';
    let expires: Date | null = null;
    let amountPaid = 0;

    if (generateKey !== false) {
      const generateRandomHex = (len: number) => {
        let result = '';
        const characters = '0123456789ABCDEF';
        for (let i = 0; i < len; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };

      const securePart1 = generateRandomHex(8);
      const securePart2 = generateRandomHex(8);
      const securePart3 = generateRandomHex(8);
      rawKey = `SYS-${securePart1}-${securePart2}-${securePart3}`;

      expires = calculateExpiry(subscriptionLength, customDate);

      switch(subscriptionLength) {
        case '1_day': amountPaid = 50; break;
        case '3_days': amountPaid = 120; break;
        case '7_days': amountPaid = 250; break;
        case '1_month': amountPaid = 800; break;
        case '3_months': amountPaid = 2160; break;
        case '7_months': amountPaid = 4480; break;
        case '1_year': amountPaid = 6720; break;
        case '2_years': amountPaid = 11520; break;
        case 'custom': 
          if (customDate) {
            const days = Math.ceil((new Date(customDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            amountPaid = Math.max(1, days) * 6.90;
          }
          break;
        default: amountPaid = 6720; break;
      }
    }

    const newClient = await prisma.client.create({
      data: {
        id: Date.now().toString(),
        name: name,
        organization: organization || '',
        company: company || '',
        branch: branch || 'Main Branch',
        contactNumber: contactNumber || '',
        maxDevices: maxDevices || 1,
        status: generateKey === false ? 'unlicensed' : 'active',
        systemType: systemType || 'POS',
        lat: lat || 14.5995,
        lng: lng || 120.9842,
        key: rawKey || null,
        expires: expires,
        amountPaid: amountPaid,
        devices: [],
      }
    });

    if (generateKey === false) {
      return NextResponse.json({ success: true, client: newClient });
    }
    
    return NextResponse.json({ success: true, client: newClient, rawKey: rawKey });
  } catch (error: any) {
    console.error('API Error in POST /api/clients:', error);
    return NextResponse.json({ success: false, error: 'Failed to add client: ' + error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('auth_token')?.value !== SECURE_TOKEN_VALUE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, action, daysToRenew, maxDevices, subscriptionLength, customDate, systemType, amount } = await request.json();
    if (!id || !['revoke', 'lockdown', 'renew', 'lift_lockdown', 'generate_key', 'add_terminals'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id }
    });
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    let updatedClient;

    if (action === 'revoke') {
      updatedClient = await prisma.client.update({
        where: { id },
        data: { status: 'revoked' }
      });
    } else if (action === 'lockdown') {
      updatedClient = await prisma.client.update({
        where: { id },
        data: { status: 'locked_down' }
      });
    } else if (action === 'lift_lockdown') {
      updatedClient = await prisma.client.update({
        where: { id },
        data: { status: 'active' }
      });
    } else if (action === 'renew') {
      let baseDate = client.expires ? new Date(client.expires) : new Date();
      if (baseDate < new Date() || isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
      
      const days = daysToRenew ? parseInt(daysToRenew) : 365;
      baseDate.setDate(baseDate.getDate() + days);
      
      updatedClient = await prisma.client.update({
        where: { id },
        data: {
          expires: baseDate,
          status: 'active'
        }
      });
    } else if (action === 'add_terminals') {
      const expiryDate = client.expires ? new Date(client.expires) : new Date();
      const now = new Date();
      let daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (daysLeft < 0) daysLeft = 0;
      
      const extraTerminals = amount || 1;
      const ratePerDay = 6.90;
      const proratedCost = Math.max(1, daysLeft) * ratePerDay * extraTerminals;
      
      updatedClient = await prisma.client.update({
        where: { id },
        data: {
          maxDevices: (client.maxDevices || 1) + extraTerminals
        }
      });
      
      try {
        await prisma.billing.create({
          data: {
            id: 'INV-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            clientId: client.id,
            clientName: client.name,
            licenseKey: client.key || '',
            type: 'ADD_TERMINAL',
            details: `Added ${extraTerminals} extra terminal(s). Synced to expiry: ${expiryDate.toLocaleDateString()} (${daysLeft} days left).`,
            amount: proratedCost,
            date: new Date(),
            status: 'PAID'
          }
        });
      } catch (err) {
        console.error('Failed to save billing record:', err);
      }

    } else if (action === 'generate_key') {
      const generateRandomHex = (len: number) => {
        let result = '';
        const characters = '0123456789ABCDEF';
        for (let i = 0; i < len; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };

      const securePart1 = generateRandomHex(8);
      const securePart2 = generateRandomHex(8);
      const securePart3 = generateRandomHex(8);
      const rawKey = `SYS-${securePart1}-${securePart2}-${securePart3}`;
      
      const nextDate = calculateExpiry(subscriptionLength, customDate);

      let addAmount = 0;
      switch(subscriptionLength) {
        case '1_day': addAmount = 50; break;
        case '3_days': addAmount = 120; break;
        case '7_days': addAmount = 250; break;
        case '1_month': addAmount = 800; break;
        case '3_months': addAmount = 2160; break;
        case '7_months': addAmount = 4480; break;
        case '1_year': addAmount = 6720; break;
        case '2_years': addAmount = 11520; break;
        case 'custom': 
          if (customDate) {
            const days = Math.ceil((new Date(customDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            addAmount = Math.max(1, days) * 6.90;
          }
          break;
        default: addAmount = 6720; break;
      }

      const updateData: any = {
        key: rawKey,
        expires: nextDate,
        status: 'active',
        amountPaid: (client.amountPaid || 0) + addAmount,
      };

      if (maxDevices) updateData.maxDevices = maxDevices;
      if (systemType) updateData.systemType = systemType;

      updatedClient = await prisma.client.update({
        where: { id },
        data: updateData
      });

      return NextResponse.json({ success: true, client: updatedClient, rawKey });
    } else {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error: any) {
    console.error('API Error in PATCH /api/clients:', error);
    return NextResponse.json({ success: false, error: 'Failed to update client: ' + error.message }, { status: 500 });
  }
}
