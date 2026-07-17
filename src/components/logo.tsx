import Link from "next/link";
import Image from "next/image";

export function Logo({
  className = "",
  height = 28,
  /** Surfaces that are always dark (e.g. the footer) regardless of the
   *  site's light/dark toggle — always show the dark-mode logo. */
  onDark = false,
}: {
  className?: string;
  height?: number;
  onDark?: boolean;
}) {
  const width = height * 4;

  if (onDark) {
    return (
      <Link href="/" className={`inline-flex items-center ${className}`}>
        <Image
          src="/logo-dark.png"
          alt="BusConnect"
          width={width}
          height={height}
          style={{ height, width: "auto" }}
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="BusConnect"
        width={width}
        height={height}
        style={{ height, width: "auto" }}
        priority
        className="block dark:hidden"
      />
      <Image
        src="/logo-dark.png"
        alt="BusConnect"
        width={width}
        height={height}
        style={{ height, width: "auto" }}
        priority
        className="hidden dark:block"
      />
    </Link>
  );
}
