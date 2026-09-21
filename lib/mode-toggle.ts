// Light/Themed mode -- a client-only preference toggle (no backend, no user
// accounts) that swaps the base background/surface/border/text/accent
// colors between the site's default "Themed" dark-brown-and-gold palette
// and an alternate high-contrast "Light" palette. Deliberately narrow in
// scope: it does not reskin decorative/textured components (talent tree,
// spellbook parchment, corner brackets, etc.) and does not touch typography
// -- see the .light-mode block in globals.css for exactly what it changes
// and why.

// Applied to <html> when Light mode is active; absent (the default) means
// Themed mode. Kept as "light-mode" rather than "readable-mode" -- the
// class/labels were renamed to the Light/Themed naming, but the storage key
// below deliberately was not (see the constant next to it).
export const LIGHT_MODE_CLASS = "light-mode";
// Not renamed alongside everything else above -- this is what's actually
// sitting in visitors' browsers already. Renaming the key would silently
// discard anyone's existing preference (it'd just look unset, falling back
// to Themed) rather than migrate it. The stored value's meaning is
// unchanged (light mode on/off), so keeping the old key costs nothing but a
// naming mismatch that's invisible to anyone but someone reading this file.
const STORAGE_KEY = "forevercraft:readable-mode";

export function setStoredLightMode(enabled: boolean): void {
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
export const LIGHT_MODE_INIT_SCRIPT = `(function(){try{if(window.localStorage.getItem("forevercraft:readable-mode")==="1"){document.documentElement.classList.add("light-mode")}}catch(e){}})();`;
