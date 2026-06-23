import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { login } from "../auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-white">
            <ShieldCheck className="size-5" strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Insurance Checks</div>
            <div className="text-xs text-muted">Reviewer sign in</div>
          </div>
        </div>

        <form action={login} className="space-y-3">
          <div>
            <label htmlFor="password" className="mb-1.5 block font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600">Incorrect password.</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
