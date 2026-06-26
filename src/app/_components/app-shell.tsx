import Link from "next/link";
import Image from "next/image";
import { Inbox, Upload as UploadIcon, LogOut } from "lucide-react";
import { logout } from "../auth-actions";

type NavKey = "submissions" | "upload";

const NAV: { key: NavKey; href: string; label: string; Icon: typeof Inbox }[] = [
  { key: "submissions", href: "/", label: "Submissions", Icon: Inbox },
  { key: "upload", href: "/upload", label: "Upload", Icon: UploadIcon },
];

/** Authenticated app frame: fixed dark brand sidebar + scrolling content area. */
export function AppShell({
  active,
  children,
}: {
  active: NavKey;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:flex flex-col bg-brand-dark text-zinc-300">
        <div className="flex items-center h-16 px-5 border-b border-white/10">
          <Image
            src="/brand/tmc-logo-white.png"
            alt="The Miles Consultancy"
            width={130}
            height={68}
            priority
            className="h-8 w-auto"
          />
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
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5",
                ].join(" ")}
              >
                <Icon className="size-4" strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="size-4" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-brand-dark">
        <Image
          src="/brand/tmc-logo-white.png"
          alt="The Miles Consultancy"
          width={110}
          height={57}
          priority
          className="h-7 w-auto"
        />
        <div className="flex items-center gap-3 text-sm">
          {NAV.map(({ key, href, label }) => (
            <Link
              key={key}
              href={href}
              className={
                key === active ? "text-white font-medium" : "text-zinc-400"
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
