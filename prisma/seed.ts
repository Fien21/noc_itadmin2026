import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Seed Clients from clients.json data
  const clients = [
    {
      id: '1792063685882',
      name: 'asdfasdf',
      organization: 'asdasdas',
      company: '',
      branch: 'sdgsdgsdf',
      contactNumber: '12312312',
      maxDevices: 5,
      status: 'active',
      systemType: 'POS',
      lat: 14.5995,
      lng: 120.9842,
      key: 'SYS-8A2638BD-95A322B0-43217A5D',
      expires: new Date('2027-10-15T11:28:05.883Z'),
      amountPaid: 6720,
      devices: [],
    },
    {
      id: '1791616559873',
      name: 'arnel',
      organization: 'kcc',
      company: '',
      branch: 'aj store',
      contactNumber: '3432423423',
      maxDevices: 5,
      status: 'active',
      systemType: 'POS',
      lat: 14.5995,
      lng: 120.9842,
      key: 'SYS-F8EABEB2-1D3F9EC0-7DB0618E',
      expires: new Date('2027-10-10T07:15:59.874Z'),
      amountPaid: 6720,
      devices: [{ id: 'DEV-8m0hxs5rz7afp5g6kfp5ed', userAgent: 'Mozilla/5.0', createdAt: '2026-10-10T07:16:45.212Z' }],
    },
    {
      id: '1791457558336',
      name: 'dasdasdas',
      organization: 'dasdasd',
      company: '',
      branch: 'dfasda',
      contactNumber: '12312312',
      maxDevices: 5,
      status: 'revoked',
      systemType: 'POS',
      lat: 14.5995,
      lng: 120.9842,
      key: 'SYS-EEE57041-2692C2A8-4B294E91',
      expires: new Date('2027-10-08T11:05:58.337Z'),
      amountPaid: 6720,
      devices: [],
    },
    {
      id: '1791353933164',
      name: 'asdasd',
      organization: 'asdasd',
      company: '',
      branch: 'asdasd',
      contactNumber: '123123',
      maxDevices: 5,
      status: 'revoked',
      systemType: 'POS',
      lat: 14.5995,
      lng: 120.9842,
      key: 'SYS-B156AFFC-703912D7-F8F50280',
      expires: new Date('2027-10-07T06:18:53.164Z'),
      amountPaid: 6720,
      devices: [],
    },
  ];

  for (const c of clients) {
    await prisma.client.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // Seed Billing
  await prisma.billing.upsert({
    where: { id: 'INV-PXN5PT6' },
    update: {},
    create: {
      id: 'INV-PXN5PT6',
      clientId: '1791353933164',
      clientName: 'Arnel James',
      licenseKey: 'SYS-0B5479D1-4222759B-8E2A78B1',
      type: 'ADD_TERMINAL',
      details: 'Added 1 extra terminal(s). Synced to expiry: 10/6/2026 (1 days left).',
      amount: 6.9,
      date: new Date('2026-10-06T04:54:36.363Z'),
      status: 'PAID',
    },
  });

  // Seed Tickets
  const tickets = [
    { id: 'TKT-YH3888Z', licenseKey: 'SYS-1369F267-AF3CFE94-CC27D9B4', subject: 'zsxczxc', message: 'zxczxc', senderName: 'aj', senderRole: 'CASHIER', status: 'OPEN', createdAt: new Date('2026-10-05T09:23:44.446Z') },
    { id: 'TKT-ALW2X1K', licenseKey: 'SYS-1369F267-AF3CFE94-CC27D9B4', subject: 'asda', message: 'dasda', senderName: 'aj', senderRole: 'CASHIER', status: 'OPEN', createdAt: new Date('2026-10-05T09:27:44.984Z') },
    { id: 'TKT-58AEXT5', licenseKey: 'SYS-F776E330-04CBC8AF-9F4C86ED', subject: 'asdasd', message: 'dasdasd', senderName: 'aj', senderRole: 'CASHIER', status: 'OPEN', createdAt: new Date('2026-10-05T09:36:38.566Z') },
    { id: 'TKT-57PZ0ML', licenseKey: 'SYS-F776E330-04CBC8AF-9F4C86ED', subject: 'asdasd', message: 'asdasds', senderName: 'System Admin', senderRole: 'ADMIN', status: 'OPEN', createdAt: new Date('2026-10-05T09:36:54.684Z') },
    { id: 'TKT-DHONTBK', licenseKey: 'SYS-0B5479D1-4222759B-8E2A78B1', subject: 'asdasd', message: 'dasdasd', senderName: 'System IT', senderRole: 'ADMIN', status: 'OPEN', createdAt: new Date('2026-10-05T09:37:05.719Z') },
    { id: 'TKT-TNHRPTE', licenseKey: 'SYS-F776E330-04CBC8AF-9F4C86ED', subject: 'asdasd', message: 'asdasd', senderName: 'System Admin', senderRole: 'ADMIN', status: 'OPEN', createdAt: new Date('2026-10-05T09:41:45.104Z') },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  // Seed Broadcast (default off)
  const existing = await prisma.broadcast.findFirst();
  if (!existing) {
    await prisma.broadcast.create({ data: { active: false, message: '', type: 'info' } });
  }

  console.log('✅ Adminsite database seeded successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
