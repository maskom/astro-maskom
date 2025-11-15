import { type APIRoute } from 'astro';
import { emailTemplateService } from '../../../lib/email-templates';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const templateType = url.searchParams.get('type');
    const language = (url.searchParams.get('language') as 'id' | 'en') || 'id';
    const preview = url.searchParams.get('preview') === 'true';

    if (!templateType) {
      return new Response(
        JSON.stringify({ 
          error: 'Template type is required',
          availableTemplates: emailTemplateService.getAvailableTemplates()
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get sample data for the template
    const sampleData = emailTemplateService.getSampleData(templateType, language);

    // Render the template
    const result = await emailTemplateService.renderTemplate({
      type: templateType as any,
      language,
      data: sampleData
    });

    if (preview) {
      // Return HTML for preview
      return new Response(result.html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } else {
      // Return JSON with metadata
      return new Response(JSON.stringify({
        ...result,
        sampleData
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in email preview API:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { templateType, language = 'id', data } = body;

    if (!templateType) {
      return new Response(
        JSON.stringify({ error: 'Template type is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate template data
    const validation = emailTemplateService.validateTemplateData(templateType, data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          errors: validation.errors 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Render the template
    const result = await emailTemplateService.renderTemplate({
      type: templateType,
      language,
      data
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in email render API:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};