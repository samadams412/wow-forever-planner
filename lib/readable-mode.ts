// "Readable mode" -- a client-only preference toggle (no backend, no user
// accounts) that swaps the heading font and base text/background colors for
// a plainer, higher-contrast look. Deliberately narrow in scope: it does not
// reskin decorative/textured components (talent tree, spellbook parchment,
// corner brackets, etc.) -- see the .readable-mode block in globals.css for
// exactly what it changes and why.

export const READABLE_MODE_CLASS = "readable-mode";
const STORAGE_KEY = "forevercraft:readable-mode";

export function setStoredReadableMode(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Nothing to do if storage isn't available -- the toggle still works
    // for the rest of this page load, it just won't persist.
  }
}

// Inlined into a blocking <script> in the root layout so the class lands on
// <html> before first paint -- applying it only from a useEffect (i.e.
// after React hydrates) would flash the default theme first on every load.
// Kept as a plain string (not a .js file Next can bundle/hash) since this
// needs to run as an inline script tag, and intentionally has no dependency
// on the constants above so it can't fail if this module's bundling ever
// changes -- keep the storage key and class name here in sync with the
// exported constants by hand.
export const READABLE_MODE_INIT_SCRIPT = `(function(){try{if(window.localStorage.getItem("forevercraft:readable-mode")==="1"){document.documentElement.classList.add("readable-mode")}}catch(e){}})();`;
