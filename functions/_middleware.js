export const onRequest = async ({ request, next }) => {
  const response = await next();
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/assets/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  } else {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }
  return response;
};
