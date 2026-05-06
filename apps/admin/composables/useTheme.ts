export const useTheme = () => {
  const theme = useState<'dark' | 'light'>('app-theme', () => 'dark');

  if (import.meta.client) {
    const saved = localStorage.getItem('nd-theme') as 'dark' | 'light' | null;
    if (saved) theme.value = saved;
    document.documentElement.setAttribute('data-theme', theme.value);
  }

  watch(theme, (t) => {
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('nd-theme', t);
    }
  });

  const toggleTheme = () => { theme.value = theme.value === 'dark' ? 'light' : 'dark'; };

  return { theme, toggleTheme };
};
