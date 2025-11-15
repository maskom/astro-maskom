import type { APIRoute } from "astro";
import { createIncident, getAllIncidents, updateIncident } from "../../lib/status";
import { sanitizeIncidentData, sanitizeText } from "../../lib/sanitization";

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
    const rawData = await request.json();
    
    // Sanitize input data
    const sanitizedData = sanitizeIncidentData(rawData);
    
    if (!sanitizedData || !sanitizedData.title || !sanitizedData.description || !sanitizedData.status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
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
    const rawData = await request.json();
    const { id } = rawData;
    
    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: "Missing incident ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Sanitize update data
    const sanitizedUpdates = sanitizeIncidentData(rawData);
    
    if (!sanitizedUpdates) {
      return new Response(JSON.stringify({ error: "Invalid update data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
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