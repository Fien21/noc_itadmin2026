import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('licenseKey');

    const tickets = await prisma.ticket.findMany({
      where: licenseKey ? { licenseKey } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ tickets: [] });
  }
}

export async function POST(request: Request) {
  try {
    const { licenseKey, subject, message, senderName, senderRole, reply, status, ticketId } = await request.json();

    if (ticketId) {
      // Update existing ticket (Admin replying)
      const dataToUpdate: any = {};
      if (reply !== undefined) dataToUpdate.reply = reply;
      if (status !== undefined) dataToUpdate.status = status;

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: dataToUpdate,
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    if (!licenseKey || !subject || !message) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const newTicket = await prisma.ticket.create({
      data: {
        id: 'TKT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        licenseKey,
        subject,
        message,
        senderName: senderName || 'Unknown User',
        senderRole: senderRole || 'User',
        status: 'OPEN',
        reply: null,
      },
    });

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error('Error processing ticket:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
