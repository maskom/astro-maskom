import type { APIRoute } from 'astro';
import { knowledgeBaseService } from '../../../../../lib/knowledge-base';
import { withApiMiddleware } from '../../../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../../../lib/errors';
import { sanitizeInput } from '../../../../../lib/sanitization';
import { logger } from '../../../../../lib/logger';

export const prerender = false;

// POST /api/kb/articles/[slug]/rate - Rate an article
export const POST: APIRoute = withApiMiddleware(
  async ({ request, params, cookies }) => {
    const slug = params?.slug;

    // Validate required fields
    if (!slug) {
      throw ErrorFactory.missingRequiredField('slug');
    }
    Validation.required(slug, 'slug');

    const body = await request.json();
    const { rating, feedback, helpful } = body;

    // Get article
    const article = await knowledgeBaseService.getArticleBySlug(slug, false);
    if (!article) {
      throw ErrorFactory.notFound('Article not found');
    }

    // Get user from session
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      throw ErrorFactory.unauthorized();
    }

    // In a real implementation, you would get the user ID from the session
    const userId = 'current-user-id'; // Would get from session

    // Validate rating if provided
    if (rating !== undefined) {
      Validation.integer(rating, 'rating');
      Validation.range(rating, 1, 5, 'rating');
    }

    // Validate helpful if provided
    if (helpful !== undefined) {
      Validation.boolean(helpful, 'helpful');
    }

    // Validate feedback if provided
    if (feedback !== undefined) {
      Validation.maxLength(feedback, 1000, 'feedback');
    }

    try {
      const ratingData = {
        article_id: article.id,
        user_id: userId,
        rating: rating || 0,
        feedback: feedback ? sanitizeInput(feedback.trim()) : undefined,
        helpful: helpful !== undefined ? helpful : false,
        ip_address:
          request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      };

      const savedRating = await knowledgeBaseService.rateArticle(ratingData);

      return new Response(
        JSON.stringify({
          success: true,
          data: savedRating,
          message: 'Rating submitted successfully',
          meta: {
            timestamp: new Date().toISOString(),
            request_id: crypto.randomUUID(),
          },
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      logger.error('Rating submission error', error instanceof Error ? error : new Error(String(error)), { 
        module: 'api', 
        endpoint: 'kb/articles/[slug]/rate', 
        method: 'POST',
        article_slug: slug,
        user_id: userId
      });
      throw ErrorFactory.internalError('Failed to submit rating');
    }
  }
);

// GET /api/kb/articles/[slug]/ratings - Get article ratings
export const GET: APIRoute = withApiMiddleware(async ({ params }) => {
  const slug = params?.slug;

  // Validate required fields
  if (!slug) {
    throw ErrorFactory.missingRequiredField('slug');
  }
  Validation.required(slug, 'slug');

  // Get article
  const article = await knowledgeBaseService.getArticleBySlug(slug, false);
  if (!article) {
    throw ErrorFactory.notFound('Article not found');
  }

  try {
    const ratings = await knowledgeBaseService.getArticleRatings(article.id);

    // Calculate statistics
    const totalRatings = ratings.length;
    const averageRating =
      totalRatings > 0
        ? Math.round(
            (ratings.reduce((sum, rating) => sum + rating.rating, 0) /
              totalRatings) *
              10
          ) / 10
        : 0;
    const helpfulCount = ratings.filter(r => r.helpful).length;
    const notHelpfulCount = ratings.filter(r => r.helpful === false).length;

    // Rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
      rating: star,
      count: ratings.filter(r => r.rating === star).length,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ratings: ratings.slice(0, 50), // Return latest 50 ratings
          statistics: {
            total_ratings: totalRatings,
            average_rating: averageRating,
            helpful_count: helpfulCount,
            not_helpful_count: notHelpfulCount,
            rating_distribution: ratingDistribution,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes cache
        },
      }
    );
  } catch (error) {
    logger.error('Ratings fetch error', error instanceof Error ? error : new Error(String(error)), { 
      module: 'api', 
      endpoint: 'kb/articles/[slug]/rate', 
      method: 'GET',
      article_slug: slug
    });
    throw ErrorFactory.internalError('Failed to fetch ratings');
  }
});
