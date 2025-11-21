// API endpoint for coverage map data
import type { APIRoute } from 'astro';
import { coverageService } from '../../../lib/coverage';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const zoneId = searchParams.get('zone');

    const mapData = await coverageService.getCoverageMapData();

    // Filter by zone if specified
    if (zoneId) {
      mapData.areas = mapData.areas.filter(area => area.zone_id === zoneId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mapData 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800' // 30 minutes cache
        } 
      }
    );
  } catch (error) {
    console.error('Coverage map API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch coverage map data',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};