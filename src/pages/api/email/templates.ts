import { type APIRoute } from 'astro';
import { emailTemplateService } from '../../../lib/email-templates';

export const GET: APIRoute = async () => {
  try {
    const templates = emailTemplateService.getAvailableTemplates();
    
    const templateInfo = templates.map(type => ({
      type,
      sampleData: {
        id: emailTemplateService.getSampleData(type, 'id'),
        en: emailTemplateService.getSampleData(type, 'en')
      }
    }));

    return new Response(JSON.stringify({
      templates: templateInfo,
      count: templates.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in email templates API:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};