import { completeNewPasswordInputSchema, signInInputSchema, type CompleteNewPasswordInput, type SignInInput } from "@pacd/contracts";
import { ArrowRight, FileCheck2, FolderKanban, RefreshCw, ShieldCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

export interface LocalIdentity {
  displayName: string;
  employeeCode: string;
  id: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  username: string;
}

export function LoginPage({ error, identities, isLoading, onRetry, onSignIn }: {
  error: string | null;
  identities: ReadonlyArray<LocalIdentity>;
  isLoading: boolean;
  onRetry: () => void;
  onSignIn: (id: string) => void;
}) {
  return (
    <main className="login-page min-h-screen bg-[var(--navy-950)]">
      <div className="login-orbit login-orbit-one" aria-hidden="true" />
      <div className="login-orbit login-orbit-two" aria-hidden="true" />
      <section className="login-story" aria-labelledby="login-story-title">
        <img alt="PACD" className="login-brand" src="/logo_left.png" />
        <div className="login-story-copy">
          <p className="type-overline text-blue-100/65">PACD WorkPilot</p>
          <h1 className="login-title" id="login-story-title">Work stays clear when everything is connected.</h1>
          <p className="login-intro">Keep project updates, requests, and claims in one focused workspace built for the way your team works.</p>
        </div>
        <div className="login-flow" aria-label="WorkPilot capabilities">
          <article className="login-flow-item"><span className="login-flow-icon"><FolderKanban aria-hidden="true" size={18} /></span><span><strong>Plan work</strong><small>Projects and activity</small></span></article>
          <span className="login-flow-line" aria-hidden="true" />
          <article className="login-flow-item"><span className="login-flow-icon"><FileCheck2 aria-hidden="true" size={18} /></span><span><strong>Review clearly</strong><small>Claims and requests</small></span></article>
          <span className="login-flow-line" aria-hidden="true" />
          <article className="login-flow-item"><span className="login-flow-icon"><ShieldCheck aria-hidden="true" size={18} /></span><span><strong>Stay accountable</strong><small>Permissions and audit</small></span></article>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="sign-in-title">
        <div className="login-card">
          <div>
            <p className="type-overline text-[var(--navy-500)]">Local development</p>
            <h2 className="login-card-title" id="sign-in-title">PACD WorkPilot</h2>
            <p className="type-body mt-2 text-[var(--muted)]">Choose a database-backed fictional identity. This local adapter is disabled in production.</p>
          </div>
          <div className="mt-8 space-y-3">
            {isLoading ? <p className="type-body text-[var(--muted)]">Loading local identities...</p> : null}
            {error ? <><p className="login-error" role="alert">{error}</p><button className="login-submit" onClick={onRetry} type="button"><span>Retry connection</span><RefreshCw aria-hidden="true" size={18} /></button></> : null}
            {identities.map((identity) => (
              <button className="login-submit" key={identity.id} onClick={() => onSignIn(identity.id)} type="button">
                <span>Continue as {identity.displayName}</span><ArrowRight aria-hidden="true" size={18} />
              </button>
            ))}
            {!isLoading && !error && identities.length === 0 ? <p className="login-error">No local identity exists. Run the database seed command.</p> : null}
          </div>
          <div className="login-help"><p>Local development access only</p><p>No password is stored or accepted by PACD WorkPilot.</p></div>
        </div>
        <p className="type-caption mt-5 text-center text-blue-100/60">Authorized PACD personnel only</p>
      </section>
    </main>
  );
}

export function HostedLoginPage({ error, isPending, needsNewPassword, onCompleteNewPassword, onSignIn }: {
  error: string | null;
  isPending: boolean;
  needsNewPassword: boolean;
  onCompleteNewPassword: (input: CompleteNewPasswordInput) => void;
  onSignIn: (input: SignInInput) => void;
}) {
  const [validationError, setValidationError] = useState<string | null>(null);

  function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signInInputSchema.safeParse({ password: form.get("password"), username: form.get("username") });
    if (!parsed.success) { setValidationError(parsed.error.issues[0]?.message ?? "Check the submitted fields"); return; }
    setValidationError(null);
    onSignIn(parsed.data);
  }

  function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = completeNewPasswordInputSchema.safeParse({ confirmPassword: form.get("confirmPassword"), newPassword: form.get("newPassword") });
    if (!parsed.success) { setValidationError(parsed.error.issues[0]?.message ?? "Check the submitted fields"); return; }
    setValidationError(null);
    onCompleteNewPassword(parsed.data);
  }

  return <AuthLayout>
    <div>
      <p className="type-overline text-[var(--navy-500)]">Secure workspace</p>
      <h2 className="login-card-title" id="sign-in-title">{needsNewPassword ? "Create your password" : "Sign in"}</h2>
      <p className="type-body mt-2 text-[var(--muted)]">{needsNewPassword ? "Replace the temporary password before continuing." : "Use the username and temporary or permanent password from your invitation."}</p>
    </div>
    {needsNewPassword ? <form className="mt-8 space-y-4" onSubmit={submitNewPassword}>
      <label className="login-label">New password<input autoComplete="new-password" className="login-input" name="newPassword" required type="password"/></label>
      <label className="login-label">Confirm new password<input autoComplete="new-password" className="login-input" name="confirmPassword" required type="password"/></label>
      <p className="type-caption text-[var(--muted)]">At least 12 characters with uppercase, lowercase, number and special character.</p>
      {validationError || error ? <p className="login-error" role="alert">{validationError ?? error}</p> : null}
      <button className="login-submit" disabled={isPending} type="submit"><span>{isPending ? "Updating..." : "Set password and continue"}</span><ArrowRight aria-hidden="true" size={18}/></button>
    </form> : <form className="mt-8 space-y-4" onSubmit={submitSignIn}>
      <label className="login-label">Username<input autoComplete="username" className="login-input" name="username" required/></label>
      <label className="login-label">Password<input autoComplete="current-password" className="login-input" name="password" required type="password"/></label>
      {validationError || error ? <p className="login-error" role="alert">{validationError ?? error}</p> : null}
      <button className="login-submit" disabled={isPending} type="submit"><span>{isPending ? "Signing in..." : "Sign in"}</span><ArrowRight aria-hidden="true" size={18}/></button>
    </form>}
    <div className="login-help"><p>Invite-only access</p><p>PACD WorkPilot never stores your password.</p></div>
  </AuthLayout>;
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="login-page min-h-screen bg-[var(--navy-950)]">
    <div className="login-orbit login-orbit-one" aria-hidden="true"/><div className="login-orbit login-orbit-two" aria-hidden="true"/>
    <section className="login-story" aria-labelledby="login-story-title"><img alt="PACD" className="login-brand" src="/logo_left.png"/><div className="login-story-copy"><p className="type-overline text-blue-100/65">PACD WorkPilot</p><h1 className="login-title" id="login-story-title">Work stays clear when everything is connected.</h1><p className="login-intro">Keep project updates, requests, and claims in one secure workspace.</p></div></section>
    <section className="login-panel" aria-labelledby="sign-in-title"><div className="login-card">{children}</div><p className="type-caption mt-5 text-center text-blue-100/60">Authorized PACD personnel only</p></section>
  </main>;
}
