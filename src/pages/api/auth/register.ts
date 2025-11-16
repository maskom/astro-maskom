import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput, sanitizeEmail } from '../../../lib/sanitization';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../lib/errors';

export const prerender = false;
export const POST: APIRoute = withApiMiddleware(
  async ({ request, redirect }) => {
    const formData = await request.formData();
    const email = sanitizeInput(formData.get('email')?.toString());
    const password = formData.get('password')?.toString(); // Don't sanitize password

    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(email || '');

    // Validate required fields
    Validation.required(sanitizedEmail, 'email');
    Validation.required(password, 'password');
    Validation.email(sanitizedEmail);

    if (!password) {
      throw ErrorFactory.missingRequiredField('password');
    }
    Validation.minLength(password, 8, 'password');

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY
    );

    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
    });

    if (error) {
      throw ErrorFactory.validationFailed(
        'Registration failed: ' + error.message
      );
    }

    return redirect('/signin');
  }
);
