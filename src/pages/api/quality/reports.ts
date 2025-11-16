import type { APIRoute } from 'astro';
import { NetworkQualityService } from '../../../lib/quality/service';

const qualityService = new NetworkQualityService();

export const GET: APIRoute = async ({ request }) => {
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const reports = await qualityService.getPerformanceReports(user.id, limit);
    
    return new Response(JSON.stringify({ reports }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Performance reports API error:', error);
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
      report_type,
      report_period_start,
      report_period_end,
      include_sla_compliance = true,
      include_benchmarks = true,
      include_recommendations = true
    } = body;

    // Validate required fields
    if (!report_type || !report_period_start || !report_period_end) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: report_type, report_period_start, report_period_end' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate report type
    const validTypes = ['monthly', 'quarterly', 'sla_certificate', 'custom'];
    if (!validTypes.includes(report_type)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid report_type. Must be one of: ${validTypes.join(', ')}` 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const reportConfig = {
      report_type,
      report_period_start: new Date(report_period_start),
      report_period_end: new Date(report_period_end),
      include_sla_compliance,
      include_benchmarks,
      include_recommendations,
    };

    const report = await qualityService.generatePerformanceReport(user.id, reportConfig);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: report,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Generate performance report API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};