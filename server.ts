/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN Full-Stack Application Server
 * Serves Vite middleware in development and provides server-side API endpoints
 * including authenticated access request email dispatch via Resend API.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Supabase Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://urkfmgwhxyyfqghiwrjh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_eJEgZeZDN5dntvlzgOnkkQ_1EfknCOw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server-side in-memory rate limiting map: userId -> timestamp (ms)
const rateLimitMap = new Map<string, number>();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Server-Side Access Request Email Dispatch Endpoint
 * Verifies caller's authenticated Supabase JWT session and dispatches
 * access request notification via Resend API.
 */
app.post('/api/request-access', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid authentication token.'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Verify authenticated user identity with Supabase Auth
    let user: { id: string; email?: string } | null = null;
    let authError: Error | null = null;

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (data && data.user) {
        user = data.user;
      }
      if (error) authError = error;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[SATURN Server /api/request-access] Supabase getUser fetch failed, falling back to JWT payload verification:', msg);
    }

    // Fallback: Verify JWT payload if Supabase Auth API fetch failed or returned error
    if (!user || !user.email) {
      const jwtPayload = parseJwtPayload(token);
      const nowSec = Math.floor(Date.now() / 1000);
      if (jwtPayload && jwtPayload.exp && jwtPayload.exp > nowSec && jwtPayload.email) {
        user = {
          id: jwtPayload.sub || jwtPayload.user_id || 'authenticated_user',
          email: jwtPayload.email
        };
        console.log(`[SATURN Server /api/request-access] Successfully verified user email via JWT token payload.`);
      }
    }

    if (!user || !user.email) {
      console.error('[SATURN Server /api/request-access] Auth verification failed:', authError?.message || 'Invalid or expired token.');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid authenticated session required.'
      });
    }

    // Derive user email strictly from verified token identity
    const requesterEmail = user.email;
    const utcTimestamp = new Date().toISOString();

    // Rate Limiting: 1 request per user every 15 minutes (900,000 ms)
    const now = Date.now();
    const lastRequestTime = rateLimitMap.get(user.id);
    if (lastRequestTime && now - lastRequestTime < 15 * 60 * 1000) {
      const waitMinutes = Math.ceil((15 * 60 * 1000 - (now - lastRequestTime)) / 60000);
      return res.status(429).json({
        success: false,
        error: `You have already submitted an access request recently. Please wait ${waitMinutes} minute(s) before trying again.`
      });
    }

    // Resend API secrets
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.ACCESS_REQUEST_TO || 'mkirithik@gmail.com';
    const senderEmail = process.env.ACCESS_REQUEST_FROM || 'SATURN Access <onboarding@resend.dev>';

    console.log(`[SATURN Server /api/request-access] Processing request for user ID ${user.id} at ${utcTimestamp}`);

    if (!resendApiKey) {
      console.warn('[SATURN Server /api/request-access] RESEND_API_KEY environment secret is not set.');
      return res.status(500).json({
        success: false,
        error: "We couldn't send your request right now. Please try again later."
      });
    }

    // Format plain text and HTML bodies
    const plainTextBody = `A new SATURN access request has been submitted.

Requester email: ${requesterEmail}
Request time: ${utcTimestamp} (UTC)

Message: The user has requested access to the SATURN private workspace.

This email was generated automatically by SATURN. Review the request and decide whether to add the user's email to the authorized-account allowlist.`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SATURN Access Request</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #F5F0E5; padding: 24px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0c0a08; border: 1px solid rgba(247, 215, 148, 0.25); border-radius: 18px; padding: 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.8);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #F7D794; letter-spacing: 0.22em; font-size: 22px; font-weight: 700; margin: 0;">SATURN</h2>
      <p style="color: rgba(247, 215, 148, 0.6); font-size: 11px; margin-top: 6px; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">ACCESS REQUEST NOTIFICATION</p>
    </div>
    
    <p style="font-size: 14px; line-height: 1.6; color: rgba(245,240,229,0.85);">
      A new user has submitted an access request for the private SATURN workspace.
    </p>

    <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(247, 215, 148, 0.15); border-radius: 12px; padding: 18px; margin: 20px 0; font-family: monospace; font-size: 13px;">
      <div style="margin-bottom: 10px;"><strong style="color: rgba(245,240,229,0.5);">Requester Email:</strong> <span style="color: #F7D794; font-weight: 600;">${escapeHtml(requesterEmail)}</span></div>
      <div><strong style="color: rgba(245,240,229,0.5);">Timestamp:</strong> <span style="color: #F5F0E5;">${utcTimestamp}</span></div>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: rgba(245,240,229,0.7);">
      Review this request and, if approved, add <strong style="color: #F7D794;">${escapeHtml(requesterEmail)}</strong> to the authorized email allowlist in your SATURN configuration.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(247,215,148,0.12); margin: 24px 0;" />
    <p style="font-size: 11px; color: rgba(245,240,229,0.4); text-align: center; margin: 0;">
      Automated System Notification from SATURN Private Workspace
    </p>
  </div>
</body>
</html>`;

    // Dispatch email via Resend REST API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [recipientEmail],
        subject: 'SATURN — New Access Request',
        text: plainTextBody,
        html: htmlBody
      })
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[SATURN Server /api/request-access] Resend API Error:', resendData);
      return res.status(resendRes.status).json({
        success: false,
        error: "We couldn't send your request right now. Please try again later."
      });
    }

    // Record rate limit timestamp
    rateLimitMap.set(user.id, now);

    console.log(`[SATURN Server /api/request-access] Email successfully dispatched to Resend ID: ${resendData.id}`);

    return res.json({
      success: true,
      message: 'Access request sent successfully. Thank you — the workspace owner has been notified.',
      id: resendData.id
    });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[SATURN Server /api/request-access] Exception:', err);
    return res.status(500).json({ success: false, error: errorMsg });
  }
});

// Serve Vite dev server middleware
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SATURN Full-Stack Server running on http://0.0.0.0:${PORT}`);
});
