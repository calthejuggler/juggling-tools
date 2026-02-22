import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { signOut, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/get-session`,
      { credentials: "include" },
    );
    if (!res.ok) throw redirect({ to: "/login" });
    const data = await res.json();
    if (!data?.session) throw redirect({ to: "/login" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Juggling Tools</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            {session?.user && (
              <span className="text-muted-foreground text-sm">
                {session.user.name || session.user.email}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut().then(() => window.location.assign("/login"))}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
