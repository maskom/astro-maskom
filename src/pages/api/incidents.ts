import type { APIRoute } from "astro";
import { createIncident, getAllIncidents, updateIncident } from "../../lib/status";
import { sanitizeJsonInput, validateRequiredFields, escapeHtml } from "../../utils/sanitization";

export const prerender = false;

// GET endpoint to fetch all incidents
export const GET: APIRoute = async ({ url }) => {
  try {
    // Sanitize query parameters
    const searchParams = new URL(url).searchParams;
    const sanitizedParams: Record<string, string> = {};
    
    for (const [key, value] of searchParams.entries()) {
      sanitizedParams[key] = sanitizeString(value);
    }
    
    const incidents = await getAllIncidents(sanitizedParams);
    
    return new Response(JSON.stringify(incidents), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const sanitizedError = sanitizeString(error.message || 'Internal server error');
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};

// POST endpoint to create a new incident
export const POST: APIRoute = async ({ request }) => {
  try {
    const rawData = await request.json();
    
    // Sanitize input data
    const sanitizedData = sanitizeJsonInput(incidentData);
    
    // Validate required fields
    const validation = validateRequiredFields(sanitizedData, ['title', 'description', 'status']);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields", 
        missingFields: validation.missingFields 
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    
    const newIncident = await createIncident(sanitizedData);
    
    if (!newIncident) {
      return new Response(JSON.stringify({ error: "Failed to create incident" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    
    return new Response(JSON.stringify(newIncident), {
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const sanitizedError = sanitizeString(error.message || 'Internal server error');
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};

// PUT endpoint to update an existing incident
export const PUT: APIRoute = async ({ request }) => {
  try {
    const requestData = await request.json();
    const { id, ...updates } = requestData;
    
    // Validate and sanitize input
    const validation = validateRequestBody(requestData, ['id']);
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: "Validation failed", 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    
    // Sanitize update data
    const sanitizedUpdates = sanitizeJsonInput(updates);
    
    const updatedIncident = await updateIncident(id, sanitizedUpdates);
    
    if (!updatedIncident) {
      return new Response(JSON.stringify({ error: "Failed to update incident" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    
    return new Response(JSON.stringify(updatedIncident), {
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const sanitizedError = sanitizeString(error.message || 'Internal server error');
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};