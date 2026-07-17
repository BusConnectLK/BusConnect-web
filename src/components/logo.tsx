import Link from "next/link";
import { BusFront } from "lucide-react";

export function Logo({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-lg shadow-brand/20">
        <BusFront size={19} />
      </span>
      <span
        className={`font-heading text-lg font-bold tracking-tight ${
          onDark ? "text-white" : "text-slate-900 dark:text-white"
        }`}
      >
        Bus<span className="text-brand dark:text-blue-400">Connect</span>
      </span>
    </Link>
  );
}
