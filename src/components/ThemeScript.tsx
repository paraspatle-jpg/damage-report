import Script from "next/script";

const code = `(function(){try{var s=localStorage.getItem("investos-theme");var m=window.matchMedia("(prefers-color-scheme: dark)");var t=s||(m.matches?"dark":"light");if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

export function ThemeScript() {
  return (
    <Script id="investos-theme" strategy="beforeInteractive">
      {code}
    </Script>
  );
}
