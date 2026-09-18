import { useEffect, useState } from "react";

// Same "(pointer: fine)" check CustomCursor.tsx uses to skip its own
// mouse-follow effect on touch devices -- reused here to decide whether a
// desktop-only affordance (the talent tooltip's "Hold Ctrl to explain"
// prompt) should render at all, since there's no Ctrl key on mobile and a
// prompt for an interaction the device can't perform would just be dead UI.
export function usePointerFine(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFine(window.matchMedia("(pointer: fine)").matches);
  }, []);

  return fine;
}
