import { redirect } from "next/navigation";
import Image from "next/image";
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
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-col items-center gap-2 bg-brand-dark px-7 py-7">
          <Image
            src="/brand/tmc-logo-white.png"
            alt="The Miles Consultancy"
            width={170}
            height={89}
            priority
            className="h-10 w-auto"
          />
          <p className="text-sm text-zinc-400">Insurance Checks</p>
        </div>

        <form action={login} className="space-y-3 p-7">
          <p className="font-medium">Reviewer sign in</p>
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
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600">Incorrect password.</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
