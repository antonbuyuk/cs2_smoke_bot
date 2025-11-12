import { requireAuth } from '../utils/auth';

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || '';

  // Пропускаем публичные endpoints
  if (url.startsWith('/api/auth/login') || url.startsWith('/api/auth/logout')) {
    return;
  }

  // Защищаем все остальные API endpoints
  if (url.startsWith('/api/')) {
    requireAuth(event);
  }
});

