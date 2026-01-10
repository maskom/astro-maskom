// API endpoint for checking service availability at coordinates
import type { APIRoute } from 'astro';
import { coverageService } from '../../../lib/coverage';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await coverageService.checkAvailabilityByCoordinates(latitude, longitude);

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