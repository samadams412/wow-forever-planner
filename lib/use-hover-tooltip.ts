import { useRef, useState } from "react";

export function useHoverTooltip<T extends HTMLElement>(
  width: number,
  placement: "below" | "right" = "below",
  estimatedHeight = 220
) {
  const ref = useRef<T>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    if (placement === "right") {
      const left = Math.min(rect.right + 8, window.innerWidth - width - 8);
      const top = Math.min(Math.max(rect.top, 8), Math.max(8, window.innerHeight - estimatedHeight - 8));
      setPos({ top, left });
      return;
    }

    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, 8),
      window.innerWidth - width - 8
    );
    setPos({ top: rect.bottom + 6, left });
  };

  const hide = () => setPos(null);

  return { ref, pos, show, hide };
}
