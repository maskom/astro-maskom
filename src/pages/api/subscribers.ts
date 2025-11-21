import type { APIRoute } from 'astro';
import { createServiceClient } from '../../lib/supabase';
import {
  sanitizeEmail,
  sanitizeJsonInput,
  sanitizeText,
} from '../../lib/sanitization';
import { logger } from '../../lib/logger';
import { emailService } from '../../lib/email/service';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const prerender = false;

// GET endpoint to fetch subscribers
export const GET: APIRoute = async ({ url }) => {
  try {
    // Sanitize query parameters
    const searchParams = new URL(url).searchParams;
    const sanitizedParams: Record<string, string> = {};

    for (const [key, value] of searchParams.entries()) {
      sanitizedParams[key] = sanitizeText(value);
    }

    const supabase = createServiceClient();

    // Fetch subscribers from database
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(subscribers || []), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    logger.apiError('Subscribers GET error', error, {
      action: 'getSubscribers',
      endpoint: '/api/subscribers',
    });
    const sanitizedError = sanitizeText(
      error instanceof Error ? error.message : 'Internal server error'
    );
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
};

// POST endpoint to add a new subscriber
export const POST: APIRoute = async ({ request }) => {
  try {
    const requestData = await request.json();

    // Sanitize input data
    const sanitizedData = sanitizeJsonInput(requestData) as Record<
      string,
      unknown
    >;
    const { email, preferences } = sanitizedData;

    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(email as string);
    if (!sanitizedEmail) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const supabase = createServiceClient();

    // Check if email already exists
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', sanitizedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      throw checkError;
    }

    if (existingSubscriber) {
      return new Response(
        JSON.stringify({ error: 'Email already subscribed' }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    // Insert new subscriber into database
    const newSubscriber = {
      email: sanitizedEmail,
      preferences: preferences || {
        incidents: true,
        maintenance: true,
        statusChanges: true,
      },
      subscribed_at: new Date().toISOString(),
      confirmed: false, // Would be set to true after email confirmation
    };

    const { data: insertedSubscriber, error: insertError } = await (
      supabase as any
    )
      .from('subscribers')
      .insert(newSubscriber)
      .select()
      .single();

    if (insertError) throw insertError;

    // Send confirmation email
    try {
      const confirmationUrl = `${process.env.SITE_URL || 'https://maskom.co.id'}/confirm-subscription?email=${encodeURIComponent(sanitizedEmail)}&token=${insertedSubscriber.id}`;

      await emailService.sendCustomEmail({
        to: sanitizedEmail,
        subject: 'Confirm Your Subscription to Maskom Network',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #007bff; color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Maskom Network</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Confirm Your Subscription</p>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 5px 5px;">
              <h2 style="color: #333; margin: 0 0 20px 0;">Welcome to Maskom Network!</h2>
              
              <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for subscribing to our notifications! Please confirm your email address to receive updates about:
              </p>
              
              <ul style="color: #666; line-height: 1.6; margin: 0 0 20px 20px;">
                <li>Service incidents and outages</li>
                <li>Scheduled maintenance notifications</li>
                <li>Service status changes</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Confirm Subscription
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
                If the button above doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #666; font-size: 12px; word-break: break-all; margin: 5px 0;">
                ${confirmationUrl}
              </p>
              
              <p style="color: #999; font-size: 12px; margin: 30px 0 0 0;">
                This confirmation link will expire in 24 hours. If you didn't request this subscription, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `
Welcome to Maskom Network!

Thank you for subscribing to our notifications! Please confirm your email address by visiting:
${confirmationUrl}

You will receive updates about:
- Service incidents and outages
- Scheduled maintenance notifications  
- Service status changes

This confirmation link will expire in 24 hours. If you didn't request this subscription, you can safely ignore this email.

Maskom Network Team
        `,
        priority: 3,
        metadata: {
          type: 'subscription_confirmation',
          subscriber_id: insertedSubscriber.id,
        },
      });

      logger.info('Confirmation email sent', {
        email: sanitizedEmail,
        subscriberId: insertedSubscriber.id,
      });
    } catch (emailError) {
      // Log email error but don't fail the subscription
      logger.error(
        'Failed to send confirmation email',
        emailError as Error | undefined,
        {
          email: sanitizedEmail,
          subscriberId: insertedSubscriber.id,
        }
      );
    }

    return new Response(JSON.stringify(insertedSubscriber), {
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    logger.apiError('Subscribers POST error', error, {
      action: 'createSubscriber',
      endpoint: '/api/subscribers',
    });
    const sanitizedError = sanitizeText(
      error instanceof Error ? error.message : 'Internal server error'
    );
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
};
