import type { APIRoute } from 'astro';
import { NetworkQualityService } from '../../../lib/quality/service';

const qualityService = new NetworkQualityService();

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await qualityService['supabase'].auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const days = parseInt(url.searchParams.get('days') || '30');
    const summary = url.searchParams.get('summary') === 'true';
    const trends = url.searchParams.get('trends') === 'true';

    if (summary) {
      // Get quality summary for dashboard
      const summaryData = await qualityService.getQualitySummary(user.id, days);
      return new Response(JSON.stringify(summaryData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (trends) {
      // Get performance trends
      const months = parseInt(url.searchParams.get('months') || '3');
      const trendsData = await qualityService.getPerformanceTrends(user.id, months);
      return new Response(JSON.stringify(trendsData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get detailed metrics
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    const start = startDate ? new Date(startDate) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const metrics = await qualityService.getQualityMetrics(user.id, start, end, limit);
    
    return new Response(JSON.stringify({ metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quality metrics API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await qualityService['supabase'].auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { 
      package_id,
      latency_avg,
      latency_min,
      latency_max,
      latency_jitter,
      packet_loss_percentage,
      packets_sent,
      packets_received,
      connection_stability_score,
      uptime_percentage,
      dns_resolution_time_ms,
      download_mbps,
      upload_mbps,
      ping_ms,
      server_location,
      test_server,
      connection_type
    } = body;

    // Validate required fields
    if (!package_id || latency_avg === undefined || packet_loss_percentage === undefined) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: package_id, latency_avg, packet_loss_percentage' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const metrics = {
      latency_avg,
      latency_min: latency_min || latency_avg,
      latency_max: latency_max || latency_avg,
      latency_jitter: latency_jitter || 0,
      packet_loss_percentage,
      packets_sent: packets_sent || 100,
      packets_received: packets_received || Math.floor(packets_sent * (1 - packet_loss_percentage / 100)),
      connection_stability_score: connection_stability_score || 100,
      uptime_percentage: uptime_percentage || 100,
      dns_resolution_time_ms: dns_resolution_time_ms || 0,
      download_mbps,
      upload_mbps,
      ping_ms,
      server_location,
      test_server,
      connection_type,
    };

    const result = await qualityService.recordQualityMetrics(user.id, package_id, metrics);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Quality metrics POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};