import type { APIRoute } from 'astro';
import { knowledgeBaseService } from '../../../lib/knowledge-base';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory } from '../../../lib/errors';

export const prerender = false;

// GET /api/kb/stats - Get knowledge base statistics
export const GET: APIRoute = withApiMiddleware(
  async ({ request, url }) => {
    const searchParams = new URL(url).searchParams;
    const includePopular = searchParams.get('popular') === 'true';
    const includeRecent = searchParams.get('recent') === 'true';

    try {
      const stats = await knowledgeBaseService.getKnowledgeBaseStats();

      const response: any = {
        success: true,
        data: stats
      };

      // Include popular articles if requested
      if (includePopular) {
        const popularArticles = await knowledgeBaseService.getPopularArticles(10);
        response.data.popular_articles = popularArticles;
      }

      // Include recent articles if requested
      if (includeRecent) {
        const recentArticles = await knowledgeBaseService.getArticles({
          limit: 10,
          sort_by: 'published_at',
          sort_order: 'desc'
        });
        response.data.recent_articles = recentArticles;
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600' // 10 minutes cache
        }
      });

    } catch (error) {
      console.error('Stats fetch error:', error);
      throw ErrorFactory.internalError('Failed to fetch statistics');
    }
  }
);