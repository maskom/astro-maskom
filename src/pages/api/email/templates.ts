import { json } from '@astrojs/cloudflare';
import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    const isActive = url.searchParams.get('isActive') !== 'false';

    const queueService = emailService.getQueueService();
    const templates = await queueService.getTemplates({
      category: category || undefined,
      isActive
    });

    return json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, description, subject_template, html_template, text_template, category } = body;

    // Validate required fields
    if (!name || !subject_template || !html_template) {
      return json(
        { error: 'Missing required fields: name, subject_template, html_template' },
        { status: 400 }
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
      is_active: true
    });

    return json({
      success: true,
      templateId,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
};