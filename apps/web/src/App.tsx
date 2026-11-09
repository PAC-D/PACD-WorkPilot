import type { Role } from "@pacd/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AppShell } from "./components/app-shell";
import { demoPrincipals } from "./data/demo-data";
import { getNavigation } from "./lib/navigation";
import { AdminDashboard, ModulePreview, SuperAdminDashboard, UserDashboard } from "./pages/dashboards";

async function loadDemoPrincipal(role: Role) {
  return Promise.resolve(demoPrincipals[role]);
}

export function App() {
  const [role, setRole] = useState<Role>("USER");
  const [activePage, setActivePage] = useState("overview");
  const queryClient = useQueryClient();
  const principalQuery = useQuery({
    queryFn: () => loadDemoPrincipal(role),
    queryKey: ["demo", "principal", role],
    refetchInterval: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const principal = principalQuery.data ?? demoPrincipals[role];
  const activeLabel = useMemo(
    () => getNavigation(principal).find((item) => item.id === activePage)?.label ?? "Overview",
    [activePage, principal],
  );

  function handleRoleChange(nextRole: Role) {
    queryClient.clear();
    setRole(nextRole);
    setActivePage("overview");
  }

  function dashboard() {
    const onRefresh = () => void principalQuery.refetch();
    if (principal.role === "USER") return <UserDashboard onNavigate={setActivePage} onRefresh={onRefresh} principal={principal} />;
    if (principal.role === "ADMIN") return <AdminDashboard onRefresh={onRefresh} principal={principal} />;
    return <SuperAdminDashboard onRefresh={onRefresh} principal={principal} />;
  }

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      onRoleChange={handleRoleChange}
      principal={principal}
    >
      {activePage === "overview" ? dashboard() : <ModulePreview label={activeLabel} onBack={() => setActivePage("overview")} />}
    </AppShell>
  );
}

