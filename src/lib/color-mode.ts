// Light and dark mode. The choice is kept in localStorage; with no choice the
// device setting applies. COLOR_MODE_SCRIPT runs at the top of <body> before the first
// paint so the page never flashes the wrong colours.

export type ColorMode = "light" | "dark";
export const COLOR_MODE_KEY = "staynest-color-mode";

export const COLOR_MODE_SCRIPT = `(function(){try{var k=${JSON.stringify(COLOR_MODE_KEY)},s=localStorage.getItem(k),m=window.matchMedia("(prefers-color-scheme: dark)"),d=document.documentElement;function a(){var v=localStorage.getItem(k);d.dataset.theme=v==="dark"||v==="light"?v:m.matches?"dark":"light"}a();m.addEventListener("change",a)}catch(e){document.documentElement.dataset.theme="light"}})()`;

export function readColorMode(): ColorMode | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setColorMode(mode: ColorMode) {
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode);
  } catch {
    // Private browsing can block storage; the switch still applies to this page.
  }
  document.documentElement.dataset.theme = mode;
}

/** Calls back whenever the mode changes, from the switch or the device setting. */
export function subscribeColorMode(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
