// API endpoint for creating coverage leads
import type { APIRoute } from 'astro';
import { coverageService } from '../../../lib/coverage';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, phone, address, latitude, longitude, notes, preferred_contact_method } = body;

    // Validate required fields
    if (!name || !email || !address) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and address are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const leadData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      address: address.trim(),
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      notes: notes?.trim() || undefined,
      preferred_contact_method: preferred_contact_method || 'email'
    };

    const lead = await coverageService.createLead(leadData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: lead,
        message: 'Lead created successfully' 
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Lead creation API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create lead',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};