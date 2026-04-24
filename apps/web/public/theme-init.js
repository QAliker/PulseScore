// eslint-disable-next-line @typescript-eslint/no-unused-vars
(function(){try{var s=localStorage.getItem('pulse-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||(!s&&m);if(d)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();
