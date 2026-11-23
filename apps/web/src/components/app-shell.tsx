import type { Principal } from "@pacd/contracts";
import { Button, IconButton } from "@pacd/ui";
import {
  Activity,
  Bell,
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
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { addBasePath, normalizeBasePath } from "../lib/base-path";
import { getNavigation } from "../lib/navigation";

const logoSource = addBasePath("/logo_left.png", normalizeBasePath(import.meta.env.BASE_URL));

const icons: Record<string, ReactNode> = {
  audit: <ShieldCheck aria-hidden="true" size={18} />,
  claims: <ReceiptText aria-hidden="true" size={18} />,
  configuration: <Settings2 aria-hidden="true" size={18} />,
  "my-work": <Activity aria-hidden="true" size={18} />,
  overview: <Gauge aria-hidden="true" size={18} />,
  people: <UsersRound aria-hidden="true" size={18} />,
  profile: <UserRound aria-hidden="true" size={18} />,
  projects: <FolderKanban aria-hidden="true" size={18} />,
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigation = getNavigation(principal);

  useEffect(() => {
    if (!notificationsOpen) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (event.target instanceof Node && !notificationsRef.current?.contains(event.target)) setNotificationsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

  function followNavigation(event: ReactMouseEvent<HTMLAnchorElement>, pageId: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(pageId);
    setMobileOpen(false);
  }

  const sidebar = (
    <>
      <div className="sidebar-brand-section flex h-17 items-center px-4 pr-14 lg:pr-4">
        <img alt="PACD" className="brand-logo h-auto w-28 max-w-full" src={logoSource} />
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="type-overline px-2 pb-2 text-white/55">Workspace</p>
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              <a
                aria-current={activePage === item.id ? "page" : undefined}
                className={`sidebar-nav-link interactive-control type-body flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium ${activePage === item.id ? "sidebar-nav-link-active text-white" : "text-white/75 hover:text-white"}`}
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
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-56 flex-col lg:flex">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-[var(--navy-950)]/50" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="app-sidebar relative flex h-full w-72 flex-col shadow-xl">
            <IconButton className="absolute right-3 top-3 bg-white/80 shadow-sm" label="Close navigation" onClick={() => setMobileOpen(false)}>
              <X aria-hidden="true" size={19} />
            </IconButton>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-56">
        <header className="app-topbar sticky top-0 z-20 flex h-17 items-center justify-between px-4 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <IconButton className="lg:hidden" label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu aria-hidden="true" size={19} />
            </IconButton>
            <p className="topbar-title">WorkPilot</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative" ref={notificationsRef}>
              <IconButton
                aria-controls="notification-panel"
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                className="topbar-notification-button"
                label="Notifications"
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell aria-hidden="true" size={18} />
              </IconButton>
              {notificationsOpen ? (
                <section aria-label="Notifications" className="notification-panel" id="notification-panel" role="dialog">
                  <div className="notification-panel-header">
                    <h2 className="type-section-title text-[var(--navy-900)]">Notifications</h2>
                  </div>
                  <div className="notification-empty-state">
                    <span className="notification-empty-icon"><Bell aria-hidden="true" size={20} /></span>
                    <p className="type-body text-[var(--muted)]">No notifications</p>
                  </div>
                </section>
              ) : null}
            </div>
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

