export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function buildThemeCSS(primaryHex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryHex)) return "";

  const [h, s, l] = hexToHsl(primaryHex);

  // Light mode primary: keep saturation, clamp lightness to readable range
  const lightL = Math.min(Math.max(l, 20), 45);
  // Dark mode primary: significantly lighter so it reads on dark backgrounds
  const darkL = Math.min(lightL + 28, 75);
  const darkS = Math.max(s - 5, 40);

  // Sidebar: very dark shades derived from the same hue
  const sidebarFromL = Math.max(Math.round(lightL * 0.45), 5);
  const sidebarToL = Math.max(Math.round(lightL * 0.25), 3);

  return `
    :root {
      --primary: ${h} ${s}% ${lightL}%;
      --primary-foreground: 0 0% 100%;
      --secondary: ${h} 25% 94%;
      --secondary-foreground: ${h} 40% 25%;
      --muted: ${h} 15% 95%;
      --muted-foreground: ${h} 8% 46%;
      --accent: ${h} 25% 94%;
      --accent-foreground: ${h} ${s}% ${lightL}%;
      --border: ${h} 15% 88%;
      --input: ${h} 15% 88%;
      --ring: ${h} ${s}% ${lightL}%;
      --foreground: ${h} 20% 10%;
      --card-foreground: ${h} 20% 10%;
      --popover-foreground: ${h} 20% 10%;
      --sidebar-gradient-from: ${h} ${s}% ${sidebarFromL}%;
      --sidebar-gradient-to: ${h} ${s}% ${sidebarToL}%;
    }
    .dark {
      --primary: ${h} ${darkS}% ${darkL}%;
      --primary-foreground: 0 0% 100%;
      --secondary: ${h} 12% 17%;
      --secondary-foreground: ${h} 8% 90%;
      --muted: ${h} 12% 17%;
      --muted-foreground: ${h} 8% 62%;
      --accent: ${h} 12% 20%;
      --accent-foreground: ${h} 8% 95%;
      --border: ${h} 12% 20%;
      --input: ${h} 12% 20%;
      --ring: ${h} ${darkS}% ${darkL}%;
      --background: ${h} 15% 7%;
      --foreground: ${h} 8% 95%;
      --card: ${h} 12% 11%;
      --card-foreground: ${h} 8% 95%;
      --popover: ${h} 12% 11%;
      --popover-foreground: ${h} 8% 95%;
      --sidebar-gradient-from: ${h} ${s}% ${sidebarFromL}%;
      --sidebar-gradient-to: ${h} ${s}% ${sidebarToL}%;
    }
  `;
}

export function applyColorTheme(primaryHex: string): void {
  if (typeof document === "undefined") return;
  const css = buildThemeCSS(primaryHex);
  if (!css) return;

  let el = document.getElementById("color-theme-override");
  if (!el) {
    el = document.createElement("style");
    el.id = "color-theme-override";
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function applyFavicon(iconUrl: string | null | undefined): void {
  if (typeof document === "undefined" || !iconUrl) return;

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = iconUrl;
}
