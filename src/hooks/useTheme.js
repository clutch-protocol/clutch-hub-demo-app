import { useEffect, useState } from 'react';

const read = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/** Tracks <html data-theme>, which App.jsx sets on theme toggle. */
export function useTheme() {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}
