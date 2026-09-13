import { useRef, useState } from "react";

export function useHoverTooltip<T extends HTMLElement>(width: number) {
  const ref = useRef<T>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, 8),
      window.innerWidth - width - 8
    );
    setPos({ top: rect.bottom + 6, left });
  };

  const hide = () => setPos(null);

  return { ref, pos, show, hide };
}
