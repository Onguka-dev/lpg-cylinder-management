"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const demoAccounts = [
  { role: "Admin", email: "admin@example.com" },
  { role: "Warehouse Manager", email: "warehouse@example.com" },
  { role: "RSO", email: "rso@example.com" },
  { role: "MSO", email: "mso@example.com" },
  { role: "Auditor", email: "auditor@example.com" },
  { role: "Customer", email: "customer@example.com" }
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          next: new URLSearchParams(window.location.search).get("next")
        })
      });

      const result = (await response.json().catch(() => ({
        error: "Login failed. Check that PostgreSQL is running and Prisma has been migrated."
      }))) as { redirectTo?: string; error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to sign in.");
        setIsSubmitting(false);
        return;
      }

      router.push(result.redirectTo ?? "/");
      router.refresh();
    } catch {
      setError("Login failed. Check that the dev server and database are running.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Demo role
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        >
          {demoAccounts.map((account) => (
            <option key={account.email} value={account.email}>
              {account.role}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="password"
          type="password"
          defaultValue="password123"
          required
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-panel hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        Demo password for all seeded users: <span className="font-semibold">password123</span>
        <br />
        New production passwords must use 12+ characters with uppercase, lowercase, number, and symbol.
      </div>
    </form>
  );
}
