import type { APIRoute } from 'astro';
import { knowledgeBaseService } from '../../../../lib/knowledge-base';
import { withApiMiddleware } from '../../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../../lib/errors';
import { logger, generateRequestId } from '../../../../lib/logger';

export const prerender = false;

// GET /api/kb/articles/[slug] - Get single article
export const GET: APIRoute = withApiMiddleware(async ({ params }) => {
  const requestId = generateRequestId();
  const slug = params?.slug;

  // Validate required fields
  if (!slug) {
    throw ErrorFactory.missingRequiredField('slug');
  }
  Validation.required(slug, 'slug');
  Validation.minLength(slug, 1, 'slug');

  try {
    const article = await knowledgeBaseService.getArticleBySlug(slug, false); // Don't increment views for API calls

    if (!article) {
      throw ErrorFactory.notFound('Article not found');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: article,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600', // 10 minutes cache
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw error;
    }
    logger.apiError('Article fetch error:', error, {
      requestId,
      endpoint: '/api/kb/articles/[slug]',
      method: 'UNKNOWN',
    });
    throw ErrorFactory.internalError('Failed to fetch article');
  }
});

// PUT /api/kb/articles/[slug] - Update article (requires support/admin role)
export const PUT: APIRoute = withApiMiddleware(async ({ request, params }) => {
  const requestId = generateRequestId();
  const slug = params?.slug;

  // Validate required fields
  if (!slug) {
    throw ErrorFactory.missingRequiredField('slug');
  }
  Validation.required(slug, 'slug');

  const body = await request.json();
  const {
    title,
    content,
    excerpt,
    categoryId,
    tags,
    difficultyLevel,
    videoUrl,
    status,
    featured,
  } = body;

  // Get existing article first
  const existingArticle = await knowledgeBaseService.getArticleBySlug(
    slug,
    false
  );
  if (!existingArticle) {
    throw ErrorFactory.notFound('Article not found');
  }

  // Validate fields if provided
  if (title !== undefined) {
    Validation.minLength(title?.trim() || '', 3, 'title');
  }

  if (content !== undefined) {
    Validation.minLength(content?.trim() || '', 10, 'content');
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = title.trim();
      updateData.slug = knowledgeBaseService.generateSlug(title.trim());
    }

    if (content !== undefined) {
      updateData.content = content.trim();
      updateData.reading_time_minutes =
        knowledgeBaseService.estimateReadingTime(content.trim());
    }

    if (excerpt !== undefined) {
      updateData.excerpt = excerpt.trim();
    }

    if (categoryId !== undefined) {
      updateData.category_id = categoryId;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (difficultyLevel !== undefined) {
      updateData.difficulty_level = difficultyLevel;
    }

    if (videoUrl !== undefined) {
      updateData.video_url = videoUrl;
    }

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && !existingArticle.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    if (featured !== undefined) {
      updateData.featured = featured;
    }

    const updatedArticle = await knowledgeBaseService.updateArticle(
      existingArticle.id,
      updateData
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedArticle,
        message: 'Article updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logger.apiError('Article update error:', error, {
      requestId,
      endpoint: '/api/kb/articles/[slug]',
      method: 'UNKNOWN',
    });
    throw ErrorFactory.internalError('Failed to update article');
  }
});

// DELETE /api/kb/articles/[slug] - Delete article (requires admin role)
export const DELETE: APIRoute = withApiMiddleware(async ({ params }) => {
  const requestId = generateRequestId();
  const slug = params?.slug;

  // Validate required fields
  if (!slug) {
    throw ErrorFactory.missingRequiredField('slug');
  }
  Validation.required(slug, 'slug');

  // Get existing article first
  const existingArticle = await knowledgeBaseService.getArticleBySlug(
    slug,
    false
  );
  if (!existingArticle) {
    throw ErrorFactory.notFound('Article not found');
  }

  try {
    await knowledgeBaseService.deleteArticle(existingArticle.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Article deleted successfully',
        meta: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logger.apiError('Article deletion error:', error, {
      requestId,
      endpoint: '/api/kb/articles/[slug]',
      method: 'UNKNOWN',
    });
    throw ErrorFactory.internalError('Failed to delete article');
  }
});
