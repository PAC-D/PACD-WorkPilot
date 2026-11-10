import type { CompleteNewPasswordInput, Permission, Principal, SignInInput } from "@pacd/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "./components/app-shell";
import { authMode, hostedAuthClient } from "./features/auth/auth-client";
import { HostedLoginPage, LoginPage } from "./features/auth/login-page";
import { ApiError, apiClient } from "./lib/api-client";
import { getNavigationPath, resolveRoute } from "./lib/navigation";
import { DatabaseDashboard } from "./pages/database-dashboard";
import { ActivitiesPage, AuditPage, ClaimsPage, ConfigurationPage, ProfilePage, ProjectsPage, RequestsPage, UsersPage } from "./pages/resource-pages";

function allowed(principal:Principal,permission:Permission){return principal.permissions.includes(permission);}

export function App() {
  const [pathname,setPathname]=useState(() => window.location.pathname);
  const [loginError,setLoginError]=useState<string|null>(null);
  const [authPending,setAuthPending]=useState(false);
  const [needsNewPassword,setNeedsNewPassword]=useState(false);
  const queryClient=useQueryClient();
  const principalQuery=useQuery({queryKey:["principal"],queryFn:apiClient.me,retry:false,refetchInterval:false});
  const signedOut=principalQuery.error instanceof ApiError&&principalQuery.error.status===401;
  const identities=useQuery({queryKey:["local-identities"],queryFn:apiClient.listIdentities,enabled:authMode==="local"&&signedOut,retry:false});

  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  function navigate(path: string, replace = false) {
    if (window.location.pathname === path) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    setPathname(path);
  }

  const routeResolution=principalQuery.data?resolveRoute(pathname,principalQuery.data):null;
  useEffect(() => {
    if(routeResolution?.kind!=="redirect")return;
    window.history.replaceState({},"",routeResolution.path);
    setPathname(routeResolution.path);
  },[routeResolution]);

  async function signIn(id:string){setLoginError(null);try{await apiClient.signInLocal(id);await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to sign in");}}
  async function signInHosted(input:SignInInput){setLoginError(null);setAuthPending(true);try{const outcome=await hostedAuthClient.signIn(input);if(outcome.status==="NEW_PASSWORD_REQUIRED"){setNeedsNewPassword(true);return;}await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to sign in");}finally{setAuthPending(false);}}
  async function completeNewPassword(input:CompleteNewPasswordInput){setLoginError(null);setAuthPending(true);try{await hostedAuthClient.completeNewPassword(input);setNeedsNewPassword(false);await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to update password");}finally{setAuthPending(false);}}
  function signOut(){void hostedAuthClient.signOut().finally(()=>{apiClient.clearIdentity();queryClient.clear();navigate("/login",true);void queryClient.invalidateQueries({queryKey:["principal"]});});}

  if(principalQuery.isPending)return <div className="grid min-h-screen place-items-center type-body text-[var(--muted)]">Connecting to PACD WorkPilot...</div>;
  const connectionError=!signedOut&&principalQuery.error instanceof Error?principalQuery.error.message:null;
  if(!principalQuery.data){
    if(authMode==="cognito")return <HostedLoginPage error={loginError??connectionError} isPending={authPending} needsNewPassword={needsNewPassword} onCompleteNewPassword={input=>void completeNewPassword(input)} onSignIn={input=>void signInHosted(input)}/>;
    return <LoginPage error={loginError??connectionError??(identities.error instanceof Error?identities.error.message:null)} identities={identities.data??[]} isLoading={signedOut&&identities.isPending} onRetry={()=>{setLoginError(null);void principalQuery.refetch();}} onSignIn={id=>void signIn(id)}/>;
  }
  const principal=principalQuery.data;
  const resolution=routeResolution??{kind:"not-found" as const};
  if(resolution.kind==="redirect") return null;
  const activePage=resolution.kind==="allowed"?resolution.pageId:"";
  function navigateToPage(pageId:string){const path=getNavigationPath(pageId,principal);if(path)navigate(path);}
  return <AppShell activePage={activePage} onNavigate={navigateToPage} onSignOut={signOut} principal={principal}>
    {resolution.kind==="allowed"?<Route activePage={resolution.pageId} principal={principal}/>:resolution.kind==="forbidden"?<RouteMessage code="403" description="You do not have permission to open this area." title="Access denied"/>:<RouteMessage code="404" description="The page does not exist or may have moved." title="Page not found"/>}
  </AppShell>;
}

function RouteMessage({code,description,title}:{code:string;description:string;title:string}){
  return <section className="mx-auto max-w-2xl rounded-xl border border-[var(--border)] bg-white p-8 text-center"><p className="type-overline text-[var(--navy-500)]">{code}</p><h1 className="type-page-title mt-2 text-[var(--navy-900)]">{title}</h1><p className="type-body mt-3 text-[var(--muted)]">{description}</p><a className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-[var(--navy-700)] px-4 type-label text-white hover:bg-[var(--navy-800)]" href="/dashboard">Return to dashboard</a></section>;
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
