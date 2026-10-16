import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const billings = await prisma.billing.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(billings);
  } catch (error) {
    console.error('Error fetching billing:', error);
    return NextResponse.json([]);
  }
}
