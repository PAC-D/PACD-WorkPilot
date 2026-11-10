import type { Principal } from "@pacd/contracts";
import { Button, IconButton } from "@pacd/ui";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  FolderKanban,
  Gauge,
  Menu,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";

import { getNavigation } from "../lib/navigation";

const icons: Record<string, ReactNode> = {
  audit: <ShieldCheck aria-hidden="true" size={18} />,
  claims: <ReceiptText aria-hidden="true" size={18} />,
  configuration: <Settings2 aria-hidden="true" size={18} />,
  "my-work": <Activity aria-hidden="true" size={18} />,
  overview: <Gauge aria-hidden="true" size={18} />,
  people: <UsersRound aria-hidden="true" size={18} />,
  profile: <UserRound aria-hidden="true" size={18} />,
  projects: <FolderKanban aria-hidden="true" size={18} />,
  reports: <BarChart3 aria-hidden="true" size={18} />,
  requests: <ClipboardList aria-hidden="true" size={18} />,
  "users-access": <ShieldCheck aria-hidden="true" size={18} />,
  work: <BriefcaseBusiness aria-hidden="true" size={18} />,
};

export function AppShell({
  activePage,
  children,
  onNavigate,
  onSignOut,
  principal,
}: {
  activePage: string;
  children: ReactNode;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  principal: Principal;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigation = getNavigation(principal);

  function followNavigation(event: MouseEvent<HTMLAnchorElement>, pageId: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(pageId);
    setMobileOpen(false);
  }

  const sidebar = (
    <>
      <div className="flex h-17 items-center border-b border-white/10 px-4 pr-14 lg:pr-4">
        <img alt="PACD" className="brand-logo h-auto w-36 max-w-full" src="/logo_left.png" />
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="type-overline px-2 pb-2 text-blue-100/55">Workspace</p>
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              <a
                aria-current={activePage === item.id ? "page" : undefined}
                className={`interactive-control type-body flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium ${activePage === item.id ? "bg-white/13 text-white" : "text-blue-50/75 hover:bg-white/8 hover:text-white"}`}
                href={item.path}
                onClick={(event) => followNavigation(event, item.id)}
              >
                {icons[item.id]}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg bg-white/7 p-3">
          <div className="type-caption flex items-center gap-2 font-medium text-white">
            <span className="size-2 rounded-full bg-emerald-400" />
            Local API connected
          </div>
          <p className="type-caption mt-1.5 text-blue-100/60">Database-backed local session</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-[var(--navy-950)] lg:flex">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="relative flex h-full w-72 flex-col bg-[var(--navy-950)] shadow-xl">
            <IconButton className="absolute right-3 top-3 border-white/20 bg-transparent text-white hover:bg-white/10" label="Close navigation" onClick={() => setMobileOpen(false)}>
              <X aria-hidden="true" size={19} />
            </IconButton>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-17 items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <IconButton className="lg:hidden" label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu aria-hidden="true" size={19} />
            </IconButton>
            <p className="type-section-title hidden text-[var(--navy-900)] sm:block">PACD WorkPilot</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="type-label hidden size-9 place-items-center rounded-full bg-[var(--navy-100)] font-medium text-[var(--navy-900)] sm:grid">
              {principal.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
            <Button onClick={onSignOut} variant="ghost">Sign out</Button>
          </div>
        </header>
        <main className="px-3 py-5 sm:px-4 lg:px-5 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

