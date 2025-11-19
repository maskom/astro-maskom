export const onRequest = async ({ request, next }) => {
  try {
    const response = await next();
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
