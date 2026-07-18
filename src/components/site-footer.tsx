import Link from "next/link";
import { AtSign, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./logo";
import { OperatorFooterLink } from "./operator-footer-link";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Columns */}
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <Logo onDark />
            <p className="ui mt-4 text-sm leading-relaxed text-zinc-400">
              Sri Lanka&apos;s smartest bus booking platform. live seat maps,
              secure payments and instant QR e-tickets across every major route.
            </p>
            <div className="mt-5 flex gap-2.5">
              {[AtSign, MessageCircle, Mail].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Icon size={16} />
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold">Explore</h4>
            <ul className="ui mt-4 flex flex-col gap-2.5 text-sm text-zinc-400">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Search buses
                </Link>
              </li>
              <li>
                <Link href="/#routes" className="transition-colors hover:text-white">
                  Popular routes
                </Link>
              </li>
              <li>
                <Link href="/#how" className="transition-colors hover:text-white">
                  How it works
                </Link>
              </li>
              <OperatorFooterLink />
            </ul>
          </div>
          <FooterCol
            title="Support"
            links={[
              ["Help centre", "/#help"],
              ["Refunds", "/#refunds"],
              ["Cancellations", "/#cancellations"],
              ["Terms", "/#terms"],
            ]}
          />

          <div>
            <h4 className="font-heading text-sm font-bold">Contact</h4>
            <ul className="ui mt-4 flex flex-col gap-3 text-sm text-zinc-400">
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-blue-400" /> +94 76 467 0645
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="text-blue-400" /> hello@busconnect.lk
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="text-blue-400" /> Colombo, Sri Lanka
              </li>
            </ul>
          </div>
        </div>

        <div className="ui flex flex-col items-start justify-between gap-3 border-t border-zinc-800 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BusConnect · Powered by MyScope (PVT) Ltd</p>
          <p>Available in English · සිංහල · தமிழ்</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-bold">{title}</h4>
      <ul className="ui mt-4 flex flex-col gap-2.5 text-sm text-zinc-400">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
