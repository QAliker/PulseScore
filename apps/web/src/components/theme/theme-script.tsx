import Script from 'next/script';

// Static constant — no user input, no XSS risk.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('pulse-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||(!s&&m);if(d)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function ThemeScript() {
  // dangerouslySetInnerHTML is safe here: THEME_SCRIPT is a build-time constant, not user-controlled. No XSS risk.
  return <Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
