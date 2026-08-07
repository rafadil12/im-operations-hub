"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { ImOneLogo } from "@/components/brand/ImOneLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { Lang } from "@/lib/types";

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5c1.5-3.2 4-4.8 6.5-4.8s5 1.6 6.5 4.8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </svg>
  );
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function subscribeClock(onStoreChange: () => void) {
  const timer = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(timer);
}

function getClockSnapshot() {
  return formatClock(new Date());
}

function getClockServerSnapshot() {
  return "";
}

export function LoginPage() {
  const router = useRouter();
  const { login, account, loading: authLoading } = useAuth();
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const clock = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLangSafe = (next: Lang) => {
    if (next !== lang) setLang(next);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({
        login: identifier,
        password,
        remember,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-bg text-text">
      {/* Soft ambient glow like the reference — no hard grid. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_35%_45%,var(--accent-soft),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.08),transparent_40%)]"
      />

      <header className="relative z-10">
        <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between gap-4 px-6 lg:px-10">
          <Link href="/" className="text-text [&_p]:!text-text-dim">
            <ImOneLogo />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex overflow-hidden rounded-md border border-border text-xs shadow-sm">
              <button
                type="button"
                onClick={() => setLangSafe("en")}
                className={`cursor-pointer px-3 py-1.5 font-semibold transition-colors ${
                  lang === "en"
                    ? "bg-accent text-white"
                    : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLangSafe("cn")}
                className={`cursor-pointer px-3 py-1.5 font-semibold transition-colors ${
                  lang === "cn"
                    ? "bg-accent text-white"
                    : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
                }`}
              >
                CN
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-surface text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-6 py-6 lg:flex-row lg:items-center lg:gap-6 lg:px-10 lg:pt-1 lg:pb-0">
        {/* Left: copy + hero art — stretch toward the login card */}
        <section className="flex min-w-0 flex-[1.35] flex-col justify-center lg:min-w-0 lg:pr-2">
          <h1 className="max-w-[22ch] text-[2rem] font-bold uppercase leading-[1.12] tracking-tight text-text sm:text-[2.5rem] lg:text-[2.75rem]">
            Intelligent
            <span
              aria-hidden
              className="mt-2.5 mb-2.5 block h-[5px] w-[7.5rem] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#22c55e]"
            />
            Operations, One Platform.
          </h1>
          <p className="mt-3 max-w-[40rem] text-[15px] leading-relaxed text-text-muted">
            Unified visibility across factory floor, IT services, logistics, and
            daily operations — all in one place.
          </p>

          <div className="relative mt-2 w-full max-w-[480px] lg:mt-3 lg:max-w-[520px] xl:max-w-[640px]">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[55%] h-[55%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.28),transparent_70%)] blur-2xl"
            />
            <Image
              src="/images/login-hero.svg"
              alt="IM One intelligent operations — factory, cloud, logistics, and dashboard connected"
              width={1536}
              height={1024}
              priority
              unoptimized
              className="relative z-[1] h-auto w-full select-none object-contain object-left drop-shadow-sm"
            />
          </div>
        </section>

        {/* Right: Sign In card */}
        <section className="flex w-full shrink-0 justify-center lg:w-[380px] lg:justify-end xl:w-[400px]">
          <div className="w-full max-w-[400px] rounded-2xl border border-border/80 bg-bg-elevated p-8 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
            <h2 className="text-[1.75rem] font-bold leading-none text-accent">
              Sign In
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Access your operations dashboard.
            </p>

            {account && !authLoading ? (
              <div className="mt-5 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                Signed in as {account.displayName}.{" "}
                <Link href="/" className="underline underline-offset-2">
                  Go to overview
                </Link>
              </div>
            ) : null}

            <form className="mt-7 space-y-5" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm text-text-muted">
                  Employee ID
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-text-dim">
                    <UserIcon />
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your employee ID"
                    className="w-full rounded-lg border border-border bg-bg/30 py-3 pl-11 pr-3 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent/20"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-text-muted">
                  Password
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-text-dim">
                    <LockIcon />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-bg/30 py-3 pl-11 pr-11 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent/20"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 grid w-9 place-items-center text-text-dim hover:text-text"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-text-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 rounded border-border accent-[var(--accent)]"
                  />
                  Remember me
                </label>
                <Link
                  href="/"
                  className="font-medium text-accent hover:underline"
                >
                  {t.auth.goToDashboard}
                </Link>
              </div>

              {error ? (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-lg bg-accent py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mt-auto">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-6 py-4 text-[11px] text-text-dim sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-2.5">
            <p>
              © 2026 IM One · v0.1.0
              {clock ? ` · ${clock}` : ""}
            </p>
          </div>
          <p className="hidden sm:block">Kayy_Nou</p>
          <div className="flex flex-wrap gap-5">
            <span className="cursor-default hover:text-text-muted">
              Privacy Policy
            </span>
            <span className="cursor-default hover:text-text-muted">
              Help Desk
            </span>
            <span className="cursor-default hover:text-text-muted">
              IT Support
            </span>
          </div>
        </div>
      </footer>

      <a
        href="mailto:it-support@imone.com"
        className="fixed bottom-5 right-5 z-20 grid size-11 place-items-center rounded-full bg-text text-lg font-semibold text-bg shadow-lg transition hover:opacity-90"
        aria-label="Help"
        title="Help"
      >
        ?
      </a>
    </div>
  );
}
