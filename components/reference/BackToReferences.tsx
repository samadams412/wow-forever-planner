import Link from "next/link";

export default function BackToReferences() {
  return (
    <Link
      href="/reference"
      className="mb-3 inline-block text-xs text-accent hover:underline"
    >
      ← Back to references
    </Link>
  );
}
