-- ===================================================
-- 1. Create Tables
-- ===================================================

CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "contactNumber" TEXT NOT NULL DEFAULT '',
    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "systemType" TEXT NOT NULL DEFAULT 'POS',
    "lat" DOUBLE PRECISION NOT NULL DEFAULT 14.5995,
    "lng" DOUBLE PRECISION NOT NULL DEFAULT 120.9842,
    "key" TEXT,
    "hashedKey" TEXT,
    "expires" TIMESTAMP(3),
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devices" JSONB NOT NULL DEFAULT '[]',
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Billing" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Billing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Broadcast" (
    "id" SERIAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'info',
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- ===================================================
-- 2. Seed Initial Data
-- ===================================================

INSERT INTO "Client" ("id", "name", "organization", "company", "branch", "contactNumber", "maxDevices", "status", "systemType", "lat", "lng", "key", "expires", "amountPaid", "devices")
VALUES 
('1792063685882', 'asdfasdf', 'asdasdas', '', 'sdgsdgsdf', '12312312', 5, 'active', 'POS', 14.5995, 120.9842, 'SYS-8A2638BD-95A322B0-43217A5D', '2027-10-15T11:28:05.883Z', 6720, '[]'::jsonb),
('1791616559873', 'arnel', 'kcc', '', 'aj store', '3432423423', 5, 'active', 'POS', 14.5995, 120.9842, 'SYS-F8EABEB2-1D3F9EC0-7DB0618E', '2027-10-10T07:15:59.874Z', 6720, '[{"id": "DEV-8m0hxs5rz7afp5g6kfp5ed", "userAgent": "Mozilla/5.0", "createdAt": "2026-10-10T07:16:45.212Z"}]'::jsonb),
('1791457558336', 'dasdasdas', 'dasdasd', '', 'dfasda', '12312312', 5, 'revoked', 'POS', 14.5995, 120.9842, 'SYS-EEE57041-2692C2A8-4B294E91', '2027-10-08T11:05:58.337Z', 6720, '[]'::jsonb),
('1791353933164', 'asdasd', 'asdasd', '', 'asdasd', '123123', 5, 'revoked', 'POS', 14.5995, 120.9842, 'SYS-B156AFFC-703912D7-F8F50280', '2027-10-07T06:18:53.164Z', 6720, '[]'::jsonb)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Billing" ("id", "clientId", "clientName", "licenseKey", "type", "details", "amount", "date", "status")
VALUES 
('INV-PXN5PT6', '1791353933164', 'Arnel James', 'SYS-0B5479D1-4222759B-8E2A78B1', 'ADD_TERMINAL', 'Added 1 extra terminal(s). Synced to expiry: 10/6/2026 (1 days left).', 6.9, '2026-10-06T04:54:36.363Z', 'PAID')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Ticket" ("id", "licenseKey", "subject", "message", "senderName", "senderRole", "status", "createdAt")
VALUES 
('TKT-YH3888Z', 'SYS-1369F267-AF3CFE94-CC27D9B4', 'zsxczxc', 'zxczxc', 'aj', 'CASHIER', 'OPEN', '2026-10-05T09:23:44.446Z'),
('TKT-ALW2X1K', 'SYS-1369F267-AF3CFE94-CC27D9B4', 'asda', 'dasda', 'aj', 'CASHIER', 'OPEN', '2026-10-05T09:27:44.984Z'),
('TKT-58AEXT5', 'SYS-F776E330-04CBC8AF-9F4C86ED', 'asdasd', 'dasdasd', 'aj', 'CASHIER', 'OPEN', '2026-10-05T09:36:38.566Z'),
('TKT-57PZ0ML', 'SYS-F776E330-04CBC8AF-9F4C86ED', 'asdasd', 'asdasds', 'System Admin', 'ADMIN', 'OPEN', '2026-10-05T09:36:54.684Z'),
('TKT-DHONTBK', 'SYS-0B5479D1-4222759B-8E2A78B1', 'asdasd', 'dasdasd', 'System IT', 'ADMIN', 'OPEN', '2026-10-05T09:37:05.719Z'),
('TKT-TNHRPTE', 'SYS-F776E330-04CBC8AF-9F4C86ED', 'asdasd', 'asdasd', 'System Admin', 'ADMIN', 'OPEN', '2026-10-05T09:41:45.104Z')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Broadcast" ("id", "active", "message", "type")
VALUES (1, false, '', 'info')
ON CONFLICT ("id") DO NOTHING;
