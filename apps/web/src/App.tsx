import type { CompleteNewPasswordInput, Permission, Principal, SignInInput } from "@pacd/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "./components/app-shell";
import { authMode, hostedAuthClient } from "./features/auth/auth-client";
import { HostedLoginPage, LoginPage } from "./features/auth/login-page";
import { ApiError, apiClient } from "./lib/api-client";
import { uiPreviewEnabled } from "./lib/ui-preview";
import { addBasePath, normalizeBasePath, stripBasePath } from "./lib/base-path";
import { getNavigationPath, resolveRoute } from "./lib/navigation";
import { DatabaseDashboard } from "./pages/database-dashboard";
import { AuditPage, ClaimsPage, ConfigurationPage, ProfilePage, RequestsPage, UsersPage } from "./pages/resource-pages";
import { SimpleActivitiesPage, SimpleProjectsPage } from "./pages/work-pages";
import { AdminVisibilityControls, TagControls } from "./pages/admin-controls";

function allowed(principal:Principal,permission:Permission){return principal.permissions.includes(permission);}
const deploymentBasePath = normalizeBasePath(import.meta.env.BASE_URL);
const currentPath = () => stripBasePath(window.location.pathname, deploymentBasePath) ?? window.location.pathname;

export function App() {
  const [pathname,setPathname]=useState(currentPath);
  const [loginError,setLoginError]=useState<string|null>(null);
  const [authPending,setAuthPending]=useState(false);
  const [needsNewPassword,setNeedsNewPassword]=useState(false);
  const [liveConnected,setLiveConnected]=useState(false);
  const queryClient=useQueryClient();
  const principalQuery=useQuery({queryKey:["principal"],queryFn:apiClient.me,retry:false,refetchInterval:false});
  const priorPrincipal=useRef<string|null>(null);
  useEffect(()=>{
    const current=principalQuery.data?`${principalQuery.data.id}:${principalQuery.data.policyVersion}`:null;
    if(priorPrincipal.current&&current&&priorPrincipal.current!==current){
      queryClient.removeQueries({predicate:query=>query.queryKey[0]!=="principal"});
    }
    priorPrincipal.current=current;
  },[principalQuery.data,queryClient]);
  useEffect(()=>{
    if(!principalQuery.data||uiPreviewEnabled)return;
    const controller=new AbortController();let reconnect:number|undefined;let connectedBefore=false;let retryDelay=2000;
    const connect=async()=>{
      try{await apiClient.streamEvents(event=>{
        const keys=event.type==="ACTIVITY_CHANGED"?["activities","dashboard"]:event.type==="CLAIM_CHANGED"?["claims","dashboard"]:event.type==="REQUEST_CHANGED"?["requests","dashboard"]:event.type==="PROJECT_CHANGED"?["projects","dashboard"]:event.type==="CONFIG_CHANGED"?["config"]:["principal"];
        for(const key of keys)void queryClient.invalidateQueries({queryKey:[key]});
      },()=>{setLiveConnected(true);retryDelay=2000;if(connectedBefore)void queryClient.invalidateQueries({predicate:query=>query.isActive()});connectedBefore=true;},controller.signal);}catch{setLiveConnected(false);}
      if(!controller.signal.aborted){setLiveConnected(false);reconnect=window.setTimeout(()=>void connect(),retryDelay);retryDelay=Math.min(retryDelay*2,30000);}
    };
    void connect();
    return ()=>{controller.abort();if(reconnect!==undefined)window.clearTimeout(reconnect);};
  },[principalQuery.data?.id,principalQuery.data?.policyVersion,queryClient]);
  const signedOut=principalQuery.error instanceof ApiError&&principalQuery.error.status===401;
  const identities=useQuery({queryKey:["local-identities"],queryFn:apiClient.listIdentities,enabled:authMode==="local"&&signedOut,retry:false});

  useEffect(() => {
    const updatePath = () => setPathname(currentPath());
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  function navigate(path: string, replace = false) {
    const browserPath = addBasePath(path, deploymentBasePath);
    if (window.location.pathname === browserPath) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", browserPath);
    setPathname(path);
  }

  const routeResolution=principalQuery.data?resolveRoute(pathname,principalQuery.data):null;
  useEffect(() => {
    if(routeResolution?.kind!=="redirect")return;
    window.history.replaceState({},"",addBasePath(routeResolution.path, deploymentBasePath));
    setPathname(routeResolution.path);
  },[routeResolution]);

  async function signIn(id:string){setLoginError(null);try{await apiClient.signInLocal(id);await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to sign in");}}
  async function signInHosted(input:SignInInput){setLoginError(null);setAuthPending(true);try{const outcome=await hostedAuthClient.signIn(input);if(outcome.status==="NEW_PASSWORD_REQUIRED"){setNeedsNewPassword(true);return;}await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to sign in");}finally{setAuthPending(false);}}
  async function completeNewPassword(input:CompleteNewPasswordInput){setLoginError(null);setAuthPending(true);try{await hostedAuthClient.completeNewPassword(input);setNeedsNewPassword(false);await queryClient.invalidateQueries({queryKey:["principal"]});}catch(error){setLoginError(error instanceof Error?error.message:"Unable to update password");}finally{setAuthPending(false);}}
  function signOut(){void hostedAuthClient.signOut().finally(()=>{apiClient.clearIdentity();queryClient.clear();navigate("/login",true);void queryClient.invalidateQueries({queryKey:["principal"]});});}

  if(principalQuery.isPending)return <div className="grid min-h-screen place-items-center type-body text-[var(--muted)]">Connecting to PACD WorkPilot...</div>;
  const connectionError=!signedOut&&principalQuery.error instanceof Error?principalQuery.error.message:null;
  if(!principalQuery.data){
    if(authMode==="cognito"||authMode==="preview")return <HostedLoginPage error={loginError??connectionError} isPending={authPending} needsNewPassword={needsNewPassword} onCompleteNewPassword={input=>void completeNewPassword(input)} onSignIn={input=>void signInHosted(input)}/>;
    return <LoginPage error={loginError??connectionError??(identities.error instanceof Error?identities.error.message:null)} identities={identities.data??[]} isLoading={signedOut&&identities.isPending} onRetry={()=>{setLoginError(null);void principalQuery.refetch();}} onSignIn={id=>void signIn(id)}/>;
  }
  const principal=principalQuery.data;
  const resolution=routeResolution??{kind:"not-found" as const};
  if(resolution.kind==="redirect") return null;
  const activePage=resolution.kind==="allowed"?resolution.pageId:"";
  function navigateToPage(pageId:string){const path=getNavigationPath(pageId,principal);if(path)navigate(path);}
  return <AppShell activePage={activePage} onNavigate={navigateToPage} onSignOut={signOut} principal={principal}>
    {resolution.kind==="allowed"?<Route activePage={resolution.pageId} principal={principal} liveConnected={liveConnected}/>:resolution.kind==="forbidden"?<RouteMessage code="403" description="You do not have permission to open this area." title="Access denied"/>:<RouteMessage code="404" description="The page does not exist or may have moved." title="Page not found"/>}
  </AppShell>;
}

function RouteMessage({code,description,title}:{code:string;description:string;title:string}){
  return <section className="mx-auto max-w-2xl rounded-xl border border-[var(--border)] bg-white p-8 text-center"><p className="type-overline text-[var(--navy-500)]">{code}</p><h1 className="type-page-title mt-2 text-[var(--navy-900)]">{title}</h1><p className="type-body mt-3 text-[var(--muted)]">{description}</p><a className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-[var(--navy-700)] px-4 type-label text-white hover:bg-[var(--navy-800)]" href={addBasePath("/dashboard", deploymentBasePath)}>Return to dashboard</a></section>;
}

function Route({activePage,principal,liveConnected}:{activePage:string;principal:Principal;liveConnected:boolean}){
  switch(activePage){
    case "overview": return <DatabaseDashboard principal={principal} liveConnected={liveConnected}/>;
    case "people": return <UsersPage canCreate={false}/>;
    case "users-access": return <div className="space-y-5"><UsersPage canCreate={allowed(principal,"users.manage")}/><AdminVisibilityControls/></div>;
    case "projects": return <SimpleProjectsPage principal={principal}/>;
    case "my-work": case "work": return <SimpleActivitiesPage principal={principal}/>;
    case "claims": return <ClaimsPage canCreate={allowed(principal,"claims.create.own")} canReview={allowed(principal,"claims.approve.scope")} principal={principal}/>;
    case "requests": return <RequestsPage canCreate={allowed(principal,"requests.create.own")} canReview={allowed(principal,"requests.review.scope")} principal={principal}/>;
    case "configuration": return <div className="space-y-5"><ConfigurationPage/><TagControls/></div>;
    case "audit": return <AuditPage/>;
    case "profile": return <ProfilePage principal={principal}/>;
    default:return <DatabaseDashboard principal={principal} liveConnected={liveConnected}/>;
  }
}
