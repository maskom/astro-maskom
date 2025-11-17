import type { APIRoute } from 'astro';
import { knowledgeBaseService } from '../../../lib/knowledge-base';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../lib/errors';
import { sanitizeInput } from '../../../lib/sanitization';

export const prerender = false;

// GET /api/kb/articles - List articles
export const GET: APIRoute = withApiMiddleware(async ({ url }) => {
  const searchParams = new URL(url).searchParams;
  const categorySlug = searchParams.get('category');
  const status = searchParams.get('status') || 'published';
  const featured = searchParams.get('featured');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const sortBy =
    (searchParams.get('sort_by') as
      | 'created_at'
      | 'published_at'
      | 'view_count'
      | 'title') || 'published_at';
  const sortOrder =
    (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc';

  // Validate parameters
  if (limit && (limit < 1 || limit > 100)) {
    throw ErrorFactory.validationError('Limit must be between 1 and 100');
  }

  if (offset && offset < 0) {
    throw ErrorFactory.validationError('Offset must be non-negative');
  }

  const validSortBy = ['created_at', 'published_at', 'view_count', 'title'];
  if (!validSortBy.includes(sortBy)) {
    throw ErrorFactory.validationError('Invalid sort field');
  }

  const validSortOrder = ['asc', 'desc'];
  if (!validSortOrder.includes(sortOrder)) {
    throw ErrorFactory.validationError('Invalid sort order');
  }

  try {
    const articles = await knowledgeBaseService.getArticles({
      category_slug: categorySlug || undefined,
      status,
      featured:
        featured === 'true' ? true : featured === 'false' ? false : undefined,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
      sort_by: sortBy,
      sort_order: sortOrder,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          articles,
          pagination: {
            limit: Math.min(limit, 100),
            offset: Math.max(offset, 0),
            total: articles.length,
          },
          filters: {
            category: categorySlug,
            status,
            featured,
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
    console.error('Articles fetch error:', error);
    throw ErrorFactory.internalError('Failed to fetch articles');
  }
});

// POST /api/kb/articles - Create new article (requires support/admin role)
export const POST: APIRoute = withApiMiddleware(
  async ({ request, cookies }) => {
    const body = await request.json();
    const {
      title,
      content,
      excerpt,
      categoryId,
      tags,
      difficultyLevel,
      videoUrl,
      status = 'draft',
    } = body;

    // Validate required fields
    Validation.required(title, 'title');
    Validation.required(content, 'content');
    Validation.required(categoryId, 'categoryId');

    Validation.minLength(title?.trim() || '', 3, 'title');
    Validation.minLength(content?.trim() || '', 10, 'content');

    if (!title?.trim() || !content?.trim()) {
      throw ErrorFactory.missingRequiredField('title and content');
    }

    // Get user from session
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      throw ErrorFactory.unauthorized();
    }

    // In a real implementation, you would verify the user's role here
    // For now, we'll assume the user is authorized if they have a valid session

    try {
      const articleData = {
        title: sanitizeInput(title.trim()),
        content: content.trim(), // Don't sanitize content as it's markdown
        excerpt: excerpt
          ? sanitizeInput(excerpt.trim())
          : knowledgeBaseService.extractExcerpt(content, 150),
        category_id: categoryId,
        author_id: 'current-user-id', // Would get from session
        status,
        tags: tags || [],
        difficulty_level: difficultyLevel || 'beginner',
        video_url: videoUrl || null,
        slug: knowledgeBaseService.generateSlug(title.trim()),
        reading_time_minutes: knowledgeBaseService.estimateReadingTime(content),
      };

      const article = await knowledgeBaseService.createArticle(articleData);

      return new Response(
        JSON.stringify({
          success: true,
          data: article,
          message: 'Article created successfully',
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
      console.error('Article creation error:', error);
      throw ErrorFactory.internalError('Failed to create article');
    }
  }
);
