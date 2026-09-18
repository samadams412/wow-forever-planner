import { useEffect, useState } from "react";

// Tracks whether Ctrl is currently held, only while `active` -- callers gate
// this on their own tooltip actually being visible, so the page isn't
// running a keydown/keyup listener per talent icon at once. Clears on
// window blur too, so Ctrl+Tab-ing away (or any other way the keyup event
// never reaches this tab) can't leave the expanded state stuck on.
export function useCtrlHeld(active: boolean): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeld(false);
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Control") setHeld(true);
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Control") setHeld(false);
    }
    function handleBlur() {
      setHeld(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [active]);

  return held;
}
