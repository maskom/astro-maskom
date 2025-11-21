// API endpoint for checking service availability by address
import type { APIRoute } from 'astro';
import { coverageService } from '../../../lib/coverage';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || address.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Address is required and must be at least 3 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await coverageService.checkAvailability(address.trim());

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5 minutes cache
        } 
      }
    );
  } catch (error) {
    console.error('Availability check API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to check availability',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};