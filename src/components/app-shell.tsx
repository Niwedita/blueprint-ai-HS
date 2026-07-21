import { Link } from "@tanstack/react-router";
import { Blocks } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Blocks className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl leading-none">Blueprint</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              AI · HubSpot
            </span>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="/#modules" className="transition-colors hover:text-foreground">
            Blueprint modules
          </a>
          <Link
            to="/compare"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Compare
          </Link>
          <Link
            to="/admin/analytics"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Analytics
          </Link>

        </nav>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
        <p>
          Blueprint AI for HubSpot &middot; A pre-sales & solution architecture assistant.
        </p>
        <p className="text-xs">Not affiliated with HubSpot, Inc.</p>
      </div>
    </footer>
  );
}
