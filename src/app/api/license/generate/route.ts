import { NextResponse } from 'next/server';
import { generateLicenseKey } from '@/utils/licenseUtils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const days = body.days ? parseInt(body.days, 10) : 30;
        
        const licenseKey = generateLicenseKey(days);
        
        return NextResponse.json({ licenseKey, success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
