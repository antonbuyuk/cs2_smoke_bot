import { requireUser, requireAdmin } from '../utils/auth';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  if (config.developMode) {
    return;
  }

  const url = event.node.req.url ?? '';
  const method = event.node.req.method ?? 'GET';

  // Auth endpoints — always public
  if (url.startsWith('/api/auth/login') || url.startsWith('/api/auth/logout')) {
    return;
  }

  // Public GET endpoints — no auth needed
  if (method === 'GET') {
    if (
      url.match(/^\/api\/grenades(\/\d+)?(\?.*)?$/) ||
      url.match(/^\/api\/(maps|sides|difficulties|lines|grenade-types)(\/.*)?(\?.*)?$/) ||
      url.match(/^\/api\/media\//)
    ) {
      return;
    }
  }

  // User-level: POST grenades and media upload
  if (
    (url === '/api/grenades' && method === 'POST') ||
    (url === '/api/media/upload' && method === 'POST')
  ) {
    requireUser(event);
    return;
  }

  // Everything else requires admin
  if (url.startsWith('/api/')) {
    requireAdmin(event);
  }
});
