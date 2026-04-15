// Runs before React hydrates to set .dark class from localStorage or prefers-color-scheme.
// Content is a static string constant — never built from user input.
const script = `(function(){try{var s=localStorage.getItem('pulse-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||(!s&&m);if(d)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
