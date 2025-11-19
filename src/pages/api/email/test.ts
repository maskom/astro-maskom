import type { APIRoute } from 'astro';
import { emailService } from '../../../lib/email';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const testEmail = url.searchParams.get('email');

    const result = await emailService.testEmail(testEmail || undefined);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Email test error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, subject, html, text } = body;

    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email address is required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const result = await emailService.sendEmail({
      to: email,
      subject: subject || 'Test Email from Maskom Network',
      html:
        html ||
        '<p>This is a test email from the Maskom Network email service.</p>',
      text:
        text || 'This is a test email from the Maskom Network email service.',
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Email send error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
