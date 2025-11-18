import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import { validateRequest, createHeaders } from '../../../lib/validation';
import { AuthSchemas } from '../../../lib/validation/schemas';

export const prerender = false;
export const POST: APIRoute = withApiMiddleware(
  validateRequest(AuthSchemas.register)(
    async ({ redirect, validatedData, requestId }) => {
      const { email, password, fullName, phone } = validatedData;

      logger.info('User registration attempt', {
        requestId,
        email,
        fullName,
        phone,
      });

      const supabase = createServerClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      });

      if (error) {
        logger.warn('Registration failed', error, {
          requestId,
          email,
        });

        throw ErrorFactory.validationFailed(
          'Registration failed: ' + error.message
        );
      }

      logger.info('Registration successful', {
        requestId,
        email,
        fullName,
      });

      return redirect('/signin');
    }
  )
);
