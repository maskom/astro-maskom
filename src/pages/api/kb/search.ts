import type { APIRoute } from 'astro';
import { knowledgeBaseService } from '../../../lib/knowledge-base';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../lib/errors';

export const prerender = false;

export const GET: APIRoute = withApiMiddleware(async ({ url }) => {
  const searchParams = new URL(url).searchParams;
  const query = searchParams.get('q');
  const categorySlug = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const difficulty = searchParams.get('difficulty');
  const tags = searchParams.get('tags')?.split(',').filter(Boolean);

  // Validate required fields
  Validation.required(query, 'query');
  Validation.minLength(query?.trim() || '', 2, 'query');

  if (!query?.trim()) {
    throw ErrorFactory.missingRequiredField('query');
  }

  try {
    const searchOptions = {
      query: query.trim(),
      category_slug: categorySlug || undefined,
      limit: Math.min(limit, 50), // Cap at 50 results
      offset: Math.max(offset, 0),
      difficulty_level: difficulty || undefined,
      tags: tags || undefined,
    };

    const results = await knowledgeBaseService.searchArticles(searchOptions);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          articles: results.articles,
          total: results.total,
          query: searchOptions.query,
          filters: {
            category: categorySlug,
            difficulty,
            tags,
          },
          pagination: {
            limit: searchOptions.limit,
            offset: searchOptions.offset,
            has_more:
              results.total > searchOptions.offset + searchOptions.limit,
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
    console.error('Search error:', error);
    throw ErrorFactory.internalError('Search failed');
  }
});
