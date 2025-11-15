import { json } from '@astrojs/cloudflare';
import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { to, subject, html, text, template, templateData, priority, metadata } = body;

    // Validate required fields
    if (!to || !subject) {
      return json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const emailId = await emailService.sendCustomEmail({
      to,
      subject,
      html,
      text,
      template,
      templateData,
      priority,
      metadata
    });

    return json({
      success: true,
      emailId,
      message: 'Email added to queue successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
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
      offset
    });

    return json({
      success: true,
      data: emails,
      pagination: {
        limit,
        offset,
        count: emails.length
      }
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
};