import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      to,
      subject,
      html,
      text,
      template,
      templateData,
      priority,
      metadata,
    } = body;

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailId = await emailService.sendCustomEmail({
      to,
      subject,
      html,
      text,
      template,
      templateData,
      priority,
      metadata,
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailId,
        message: 'Email added to queue successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const queueService = emailService.getQueueService();
    const emails = await queueService.getEmails({
      status: status || undefined,
      limit,
      offset,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: emails,
        pagination: {
          limit,
          offset,
          count: emails.length,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching emails:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch emails' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
