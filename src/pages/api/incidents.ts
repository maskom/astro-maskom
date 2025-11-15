import type { APIRoute } from "astro";
import { createIncident, getAllIncidents, updateIncident } from "../../lib/status";
import { sanitizeJsonInput, validateRequiredFields, escapeHtml } from "../../utils/sanitization";

export const prerender = false;

// GET endpoint to fetch all incidents
export const GET: APIRoute = async () => {
  try {
    const incidents = await getAllIncidents();
    
    return new Response(JSON.stringify(incidents), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// POST endpoint to create a new incident
export const POST: APIRoute = async ({ request }) => {
  try {
    const incidentData = await request.json();
    
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
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const newIncident = await createIncident(sanitizedData);
    
    if (!newIncident) {
      return new Response(JSON.stringify({ error: "Failed to create incident" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify(newIncident), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// PUT endpoint to update an existing incident
export const PUT: APIRoute = async ({ request }) => {
  try {
    const requestData = await request.json();
    const { id, ...updates } = requestData;
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing incident ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Sanitize update data
    const sanitizedUpdates = sanitizeJsonInput(updates);
    
    const updatedIncident = await updateIncident(id, sanitizedUpdates);
    
    if (!updatedIncident) {
      return new Response(JSON.stringify({ error: "Failed to update incident" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify(updatedIncident), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};