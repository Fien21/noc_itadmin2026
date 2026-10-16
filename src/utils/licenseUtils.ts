import crypto from 'crypto';

const SECRET_KEY = 'AZTECH_SUPER_SECRET_KEY_2026'; // In production, move to .env

export function generateLicenseKey(daysValid: number): string {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + daysValid);
    
    const payload = {
        exp: expDate.getTime(),
        type: 'PRO',
        issuedAt: Date.now()
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(payloadBase64);
    const signature = hmac.digest('hex');

    return `${payloadBase64}.${signature}`;
}
