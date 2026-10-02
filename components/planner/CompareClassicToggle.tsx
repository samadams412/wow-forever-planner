export default function CompareClassicToggle({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`rounded border px-2.5 py-1 text-xs font-semibold tracking-wide transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd100] ${
        checked
          ? "border-[#f2c34e] bg-[#ffd100] text-[#241a08] shadow-[0_0_9px_rgba(255,209,0,0.24)]"
          : "border-[#9c7738]/80 bg-[#17120d] text-[#e2bd62] hover:border-[#ffd100] hover:bg-[#2b2114] hover:text-[#ffe47d]"
      }`}
    >
      Compare to Classic
    </button>
  );
}
