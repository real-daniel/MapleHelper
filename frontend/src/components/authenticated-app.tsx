"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppTabs } from "@/components/app-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { API_BASE_URL, apiFetch, clearCsrfToken } from "@/lib/api";

type AuthenticatedUser = {
  id: number;
  discordUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function AuthenticatedApp() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await apiFetch("/api/v1/auth/me");
        if (response.status === 401) {
          setUser(null);
          return;
        }
        if (!response.ok) throw new Error("Could not check your sign-in status.");
        setUser(await response.json() as AuthenticatedUser);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not check your sign-in status.");
      } finally {
        setChecking(false);
      }
    }

    void loadUser();
  }, []);

  async function logout() {
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out.");
      clearCsrfToken();
      setUser(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  if (checking) {
    return <main className="auth-screen"><ThemeToggle /><p>Checking sign-in…</p></main>;
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <ThemeToggle />
        <section className="auth-card">
          <span className="brand-mark auth-mark">M</span>
          <h1>MapleHelper</h1>
          {message && <p className="message">{message}</p>}
          <a className="discord-login" href={`${API_BASE_URL}/oauth2/authorization/discord`}>
            Sign in with Discord
          </a>
        </section>
      </main>
    );
  }

  return (
    <>
      <header className="auth-bar">
        <div className="brand-lockup">
          <span className="brand-mark">M</span>
          <strong>MapleHelper</strong>
        </div>
        <div className="auth-user">
          {user.avatarUrl && <Image src={user.avatarUrl} alt="" width={36} height={36} />}
          <span><strong>{user.displayName}</strong></span>
          <ThemeToggle />
          <button className="ghost-button" type="button" onClick={logout}>Sign out</button>
        </div>
      </header>
      {message && <main><p className="message">{message}</p></main>}
      <AppTabs />
    </>
  );
}
