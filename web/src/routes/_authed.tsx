import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatches,
  useRouteContext,
} from "@tanstack/react-router";

import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { API_URL } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const res = await fetch(`${API_URL}/api/auth/get-session`, { credentials: "include" });
    if (!res.ok) throw redirect({ to: "/login" });
    const data = await res.json();
    if (!data?.session) throw redirect({ to: "/login" });
    return { session: data };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session } = useRouteContext({ from: "/_authed" });
  const { theme, toggleTheme } = useTheme();
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/";

  const isAdmin = session?.user?.role === "admin";
  const isImpersonating = !!session?.session?.impersonatedBy;

  return (
    <div className="flex h-screen flex-col">
      {isImpersonating && session?.user && (
        <ImpersonationBanner name={session.user.name} email={session.user.email} />
      )}
      <header className="border-border bg-card border-b">
        <div className="grid grid-cols-3 items-center px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Juggling Tools</h1>
          </div>
          <nav className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(currentPath === "/" && "bg-accent")}
            >
              <Link to="/" search={{ num_props: 3, max_height: 5, view: "graph" }}>
                State Graphs
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(currentPath === "/builder" && "bg-accent")}
            >
              <Link to="/builder" search={{ num_props: 3, max_height: 5 }}>
                Siteswap Builder
              </Link>
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={cn(currentPath.startsWith("/admin") && "bg-accent")}
              >
                <Link to="/admin" search={{ page: 1, sortBy: "createdAt", sortDirection: "desc" }}>
                  Admin Panel
                </Link>
              </Button>
            )}
          </nav>
          <div className="flex items-center justify-end gap-3">
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
