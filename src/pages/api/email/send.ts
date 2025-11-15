import type { APIRoute } from 'astro';
import { emailService } from '../../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { to, subject, html, text, from, replyTo } = body;

    // Validate required fields
    if (!to) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Recipient (to) is required',
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (!subject) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Subject is required',
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (!html && !text) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either html or text content is required',
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const emailOptions = {
      to: Array.isArray(to) ? to : { email: to },
      subject,
      ...(html && { html }),
      ...(text && { text }),
      ...(from && { from: Array.isArray(from) ? from : { email: from } }),
      ...(replyTo && { replyTo: { email: replyTo } }),
    };

    const result = await emailService.sendEmail(emailOptions);

    return new Response(JSON.stringify({
      success: true,
      data: result,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Email send error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};