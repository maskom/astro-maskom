import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    const isActive = url.searchParams.get('isActive') !== 'false';

    const queueService = emailService.getQueueService();
    const templates = await queueService.getTemplates({
      category: category || undefined,
      isActive,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: templates,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching templates:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch templates' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      name,
      description,
      subject_template,
      html_template,
      text_template,
      category,
    } = body;

    // Validate required fields
    if (!name || !subject_template || !html_template) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required fields: name, subject_template, html_template',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const queueService = emailService.getQueueService();
    const templateId = await queueService.createTemplate({
      name,
      description,
      subject_template,
      html_template,
      text_template,
      category: category || 'transactional',
      is_active: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        templateId,
        message: 'Template created successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating template:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create template' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
