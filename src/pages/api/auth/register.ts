import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import { validateRequest } from '../../../lib/validation';
import {
  AuthSchemas,
  ValidatedAuthData,
} from '../../../lib/validation/schemas';

export const prerender = false;
export const POST: APIRoute = withApiMiddleware(
  validateRequest(AuthSchemas.register)(
    async ({ redirect, validatedData, requestId }) => {
      const { email, password, fullName, phone } = (validatedData ||
        {}) as unknown as ValidatedAuthData;

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
        logger.warn('Registration failed', {
          requestId,
          email,
          error: error.message,
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
