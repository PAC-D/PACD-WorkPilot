import type { Permission, Principal } from "@pacd/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "./components/app-shell";
import { LoginPage } from "./features/auth/login-page";
import { ApiError, apiClient } from "./lib/api-client";
import { DatabaseDashboard } from "./pages/database-dashboard";
import { ActivitiesPage, AuditPage, ClaimsPage, ConfigurationPage, ProfilePage, ProjectsPage, RequestsPage, UsersPage } from "./pages/resource-pages";

function allowed(principal:Principal,permission:Permission){return principal.permissions.includes(permission);}

export function App() {
  const [activePage,setActivePage]=useState("overview");
  const [loginError,setLoginError]=useState<string|null>(null);
  const queryClient=useQueryClient();
  const principalQuery=useQuery({queryKey:["principal"],queryFn:apiClient.me,retry:false,refetchInterval:false});
  const signedOut=principalQuery.error instanceof ApiError&&principalQuery.error.status===401;
  const identities=useQuery({queryKey:["local-identities"],queryFn:apiClient.listIdentities,enabled:signedOut,retry:false});

  async function signIn(id:string){setLoginError(null);try{await apiClient.signInLocal(id);await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to sign in");}}
  function signOut(){apiClient.clearIdentity();queryClient.clear();setActivePage("overview");void queryClient.invalidateQueries({queryKey:["principal"]});}

  if(principalQuery.isPending)return <div className="grid min-h-screen place-items-center type-body text-[var(--muted)]">Connecting to PACD WorkPilot...</div>;
  const connectionError=!signedOut&&principalQuery.error instanceof Error?principalQuery.error.message:null;
  if(!principalQuery.data)return <LoginPage error={loginError??connectionError??(identities.error instanceof Error?identities.error.message:null)} identities={identities.data??[]} isLoading={signedOut&&identities.isPending} onRetry={()=>{setLoginError(null);void principalQuery.refetch();}} onSignIn={id=>void signIn(id)}/>;
  const principal=principalQuery.data;
  return <AppShell activePage={activePage} onNavigate={setActivePage} onSignOut={signOut} principal={principal}>
    <Route activePage={activePage} principal={principal}/>
  </AppShell>;
}

function Route({activePage,principal}:{activePage:string;principal:Principal}){
  switch(activePage){
    case "overview": case "reports": return <DatabaseDashboard principal={principal}/>;
    case "people": return <UsersPage canCreate={false}/>;
    case "users-access": return <UsersPage canCreate={allowed(principal,"users.manage")}/>;
    case "projects": return <ProjectsPage canCreate={allowed(principal,"projects.manage")}/>;
    case "my-work": case "work": return <ActivitiesPage canCreate={allowed(principal,"work.create.own")}/>;
    case "claims": return <ClaimsPage canCreate={allowed(principal,"claims.create.own")} canReview={allowed(principal,"claims.approve.scope")} principal={principal}/>;
    case "requests": return <RequestsPage canCreate={allowed(principal,"requests.create.own")} canReview={allowed(principal,"requests.review.scope")} principal={principal}/>;
    case "configuration": return <ConfigurationPage/>;
    case "audit": return <AuditPage/>;
    case "profile": return <ProfilePage principal={principal}/>;
    default:return <DatabaseDashboard principal={principal}/>;
  }
}
