import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            // Prevents Clickjacking / iframe embedding (phishing protection)
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Prevents MIME type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Basic XSS Protection
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Prevents browsers from sending the Referer header
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
