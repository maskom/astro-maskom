import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const subscription = await request.json();

    // Validate subscription data
    if (!subscription || !subscription.endpoint) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Here you would typically save the subscription to your database
    // For now, we'll just log it and return success
    console.log('Push subscription received:', subscription);

    // TODO: Save to Supabase database
    // const { data, error } = await supabase
    //   .from('push_subscriptions')
    //   .insert([{
    //     endpoint: subscription.endpoint,
    //     keys: subscription.keys,
    //     created_at: new Date().toISOString()
    //   }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription saved successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Here you would typically remove the subscription from your database
    console.log('Push subscription removed:', endpoint);

    // TODO: Remove from Supabase database
    // const { error } = await supabase
    //   .from('push_subscriptions')
    //   .delete()
    //   .eq('endpoint', endpoint);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription removed successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
