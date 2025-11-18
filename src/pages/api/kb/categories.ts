import type { APIRoute } from 'astro';
import { knowledgeBaseService } from '../../../lib/knowledge-base';
import { withApiMiddleware } from '../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../lib/errors';
import { sanitizeInput } from '../../../lib/sanitization';
import { logger, generateRequestId } from '../../../lib/logger';

export const prerender = false;

// GET /api/kb/categories - List categories
export const GET: APIRoute = withApiMiddleware(async ({ url }) => {
  const searchParams = new URL(url).searchParams;
  const activeOnly = searchParams.get('active') !== 'false'; // Default to true

  try {
    const categories = await knowledgeBaseService.getCategories(activeOnly);

    return new Response(
      JSON.stringify({
        success: true,
        data: categories,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
          filters: {
            active_only: activeOnly,
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800', // 30 minutes cache
        },
      }
    );
  } catch (error) {
    logger.apiError('Categories fetch error:', error, {
      requestId,
      endpoint: '/api/kb/categories',
      method: 'UNKNOWN'
    });
    throw ErrorFactory.internalError('Failed to fetch categories');
  }
});

// POST /api/kb/categories - Create new category (requires admin role)
export const POST: APIRoute = withApiMiddleware(async ({ request }) => {
  const body = await request.json();
  const {
    name,
    description,
    icon,
    color = '#6366f1',
    sortOrder = 0,
    parentId,
  } = body;

  // Validate required fields
  Validation.required(name, 'name');
  Validation.minLength(name?.trim() || '', 2, 'name');

  if (!name?.trim()) {
    throw ErrorFactory.missingRequiredField('name');
  }

  // Validate color format
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw ErrorFactory.validationError(
      'Invalid color format. Use hex color like #6366f1'
    );
  }

  try {
    const categoryData = {
      name: sanitizeInput(name.trim()),
      slug: knowledgeBaseService.generateSlug(name.trim()),
      description: description ? sanitizeInput(description.trim()) : undefined,
      icon: icon || '📁',
      color,
      sort_order: Math.max(0, sortOrder),
      parent_id: parentId || undefined,
      is_active: true,
    };

    const category = await knowledgeBaseService.createCategory(categoryData);

    return new Response(
      JSON.stringify({
        success: true,
        data: category,
        message: 'Category created successfully',
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
    logger.apiError('Category creation error:', error, {
      requestId,
      endpoint: '/api/kb/categories',
      method: 'UNKNOWN'
    });
    throw ErrorFactory.internalError('Failed to create category');
  }
});
