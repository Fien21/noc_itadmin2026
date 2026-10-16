import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SECURE_TOKEN_VALUE = 'system-it-secure-session-token-v1';

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('auth_token')?.value !== SECURE_TOKEN_VALUE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // In a real application, you'd fetch this from a real monitoring service (like Datadog, AWS, or Prisma DB)
  // For now, we simulate dynamic system data that generates realistic statistics.

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Generate zero heights for the last 7 days of API usage since there is no data yet
  const systemUsage = daysOfWeek.map((day) => {
    return {
      day,
      usage: 0,
      color: 'var(--accent)'
    };
  });

  const endpoints = [
    {
      path: '/api/auth/verify',
      method: 'POST',
      status: 'Online',
      latency: 0
    },
    {
      path: '/api/clients/sync',
      method: 'GET',
      status: 'Online',
      latency: 0
    },
    {
      path: '/api/telemetry',
      method: 'POST',
      status: 'Online',
      latency: 0
    }
  ];

  const monitoringData = {
    uptime: '100%',
    avgResponseTime: 0,
    totalRequests: '0',
    systemUsage,
    endpoints
  };

  return NextResponse.json(monitoringData);
}
