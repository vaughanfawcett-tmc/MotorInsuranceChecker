import Link from "next/link";
import {
  ShieldCheck,
  Inbox,
  Upload as UploadIcon,
  LogOut,
} from "lucide-react";
import { logout } from "../auth-actions";

type NavKey = "submissions" | "upload";

const NAV: { key: NavKey; href: string; label: string; Icon: typeof Inbox }[] = [
  { key: "submissions", href: "/", label: "Submissions", Icon: Inbox },
  { key: "upload", href: "/upload", label: "Upload", Icon: UploadIcon },
];

/** Authenticated app frame: fixed sidebar nav + scrolling content area. */
export function AppShell({
  active,
  children,
}: {
  active: NavKey;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-line">
          <span className="grid place-items-center size-8 rounded-lg bg-accent text-white">
            <ShieldCheck className="size-4.5" strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Insurance Checks</div>
            <div className="text-xs text-muted">Certificate validation</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ key, href, label, Icon }) => {
            const current = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={current ? "page" : undefined}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  current
                    ? "bg-zinc-100 text-ink"
                    : "text-muted hover:text-ink hover:bg-zinc-50",
                ].join(" ")}
              >
                <Icon className="size-4" strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink hover:bg-zinc-50 transition-colors"
            >
              <LogOut className="size-4" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-line bg-surface">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center size-7 rounded-md bg-accent text-white">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <span className="font-semibold tracking-tight">Insurance Checks</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {NAV.map(({ key, href, label }) => (
            <Link
              key={key}
              href={href}
              className={
                key === active ? "text-ink font-medium" : "text-muted"
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </header>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
