export default defineNuxtPlugin(async () => {
  // На SSR один раз тянем сессию по cookie, чтобы middleware и страницы
  // получили актуального user ещё до рендера и не редиректили на /login.
  const { fetchUser } = useAuth();
  await fetchUser();
});
