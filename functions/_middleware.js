export const onRequest = async ({ request, next }) => {
  const response = await next();
  response.headers.set('Cache-Control', 'max-age=3600');
  return response;
};
