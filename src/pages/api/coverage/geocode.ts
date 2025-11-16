// API endpoint for address geocoding and search
import type { APIRoute } from 'astro';
import { geocodingService } from '../../../lib/geocoding';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required and must be at least 3 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const suggestions = await geocodingService.searchAddresses(query, limit);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: suggestions,
        count: suggestions.length 
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
    console.error('Address search API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to search addresses',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

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

    const result = await geocodingService.geocodeAddress(address);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate Indonesian address
    const validation = geocodingService.validateIndonesianAddress(result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...result,
          validation
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // 1 hour cache
        } 
      }
    );
  } catch (error) {
    console.error('Address geocoding API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to geocode address',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};