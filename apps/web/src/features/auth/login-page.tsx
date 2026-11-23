import { completeNewPasswordInputSchema, signInInputSchema, type CompleteNewPasswordInput, type SignInInput } from "@pacd/contracts";
import { Activity, ArrowRight, CheckCircle2, Eye, EyeOff, FolderKanban, ReceiptText, RefreshCw } from "lucide-react";
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
      <AuthStory />
      <section className="login-panel" aria-labelledby="sign-in-title">
        <div className="login-card">
          <div>
            <h2 className="login-card-title" id="sign-in-title">Sign in</h2>
          </div>
          <div className="mt-8 space-y-3">
            {isLoading ? <p className="login-hint type-body">Loading local identities...</p> : null}
            {error ? <><p className="login-error" role="alert">{error}</p><button className="login-submit" onClick={onRetry} type="button"><span>Retry connection</span><RefreshCw aria-hidden="true" size={18} /></button></> : null}
            {identities.map((identity) => (
              <button className="login-submit" key={identity.id} onClick={() => onSignIn(identity.id)} type="button">
                <span>Continue as {identity.displayName}</span><ArrowRight aria-hidden="true" size={18} />
              </button>
            ))}
            {!isLoading && !error && identities.length === 0 ? <p className="login-error">No local identity exists. Run the database seed command.</p> : null}
          </div>
        </div>
        <p className="login-authorization type-caption text-center">Authorized PACD personnel only</p>
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

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
      <h2 className="login-card-title" id="sign-in-title">{needsNewPassword ? "Create your password" : "Sign in"}</h2>
    </div>
    {needsNewPassword ? <form className="login-form" onSubmit={submitNewPassword}>
      <PasswordField autoComplete="new-password" label="New password" name="newPassword" onToggle={() => setNewPasswordVisible((visible) => !visible)} visible={newPasswordVisible}/>
      <PasswordField autoComplete="new-password" label="Confirm new password" name="confirmPassword" onToggle={() => setConfirmationVisible((visible) => !visible)} visible={confirmationVisible}/>
      <p className="login-hint type-caption">At least 12 characters with uppercase, lowercase, number and special character.</p>
      {validationError || error ? <p className="login-error" role="alert">{validationError ?? error}</p> : null}
      <button className="login-submit" disabled={isPending} type="submit"><span>{isPending ? "Updating..." : "Set password and continue"}</span><ArrowRight aria-hidden="true" size={18}/></button>
    </form> : <form className="login-form" onSubmit={submitSignIn}>
      <label className="login-label">Username<input autoComplete="username" className="login-input" name="username" required/></label>
      <PasswordField autoComplete="current-password" label="Password" name="password" onToggle={() => setPasswordVisible((visible) => !visible)} visible={passwordVisible}/>
      {validationError || error ? <p className="login-error" role="alert">{validationError ?? error}</p> : null}
      <button className="login-submit" disabled={isPending} type="submit"><span>{isPending ? "Signing in..." : "Sign in"}</span><ArrowRight aria-hidden="true" size={18}/></button>
    </form>}
  </AuthLayout>;
}

function PasswordField({ autoComplete, label, name, onToggle, visible }: {
  autoComplete: "current-password" | "new-password";
  label: string;
  name: string;
  onToggle: () => void;
  visible: boolean;
}) {
  return <label className="login-label">
    <span>{label}</span>
    <span className="login-input-wrap">
      <input autoComplete={autoComplete} className="login-input login-password-input" name={name} required type={visible ? "text" : "password"}/>
      <button aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} className="login-password-toggle" onClick={onToggle} type="button">
        {visible ? <EyeOff aria-hidden="true" size={18}/> : <Eye aria-hidden="true" size={18}/>}
      </button>
    </span>
  </label>;
}

function AuthStory() {
  const steps = [
    { icon: <FolderKanban aria-hidden="true" size={19}/>, label: "Projects" },
    { icon: <Activity aria-hidden="true" size={19}/>, label: "Work updates" },
    { icon: <ReceiptText aria-hidden="true" size={19}/>, label: "Claims / requests" },
    { icon: <CheckCircle2 aria-hidden="true" size={19}/>, label: "Review" },
  ];

  return <section className="login-story" aria-labelledby="login-story-title">
    <div className="login-brand-frame"><img alt="PACD" className="login-brand" src="/logo_left.png" /></div>
    <div className="login-story-copy">
      <h1 className="login-title" id="login-story-title">PACD WorkPilot</h1>
      <div aria-label="WorkPilot workflow: projects, work updates, claims and requests, and review" className="workflow-loop">
        <div className="workflow-track">
          <span className="workflow-progress" aria-hidden="true" />
          {steps.map((step, index) => <div className="workflow-step-wrap" key={step.label}>
            <article className="workflow-step">
              <span className={`workflow-step-icon workflow-step-icon-${index + 1}`}>{step.icon}</span>
              <span>{step.label}</span>
            </article>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="login-page min-h-screen bg-[var(--navy-950)]">
    <div className="login-orbit login-orbit-one" aria-hidden="true"/><div className="login-orbit login-orbit-two" aria-hidden="true"/>
    <AuthStory/>
    <section className="login-panel" aria-labelledby="sign-in-title"><div className="login-card">{children}</div><p className="login-authorization type-caption text-center">Authorized PACD personnel only</p></section>
  </main>;
}
