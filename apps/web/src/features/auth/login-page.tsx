import { signInInputSchema, type SignInInput } from "@pacd/contracts";
import { ArrowRight, Eye, EyeOff, FileCheck2, FolderKanban, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginPage({
  onPreview,
  onSignIn,
}: {
  onPreview?: () => void;
  onSignIn: (input: SignInInput) => Promise<void>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = signInInputSchema.safeParse({
      password: formData.get("password"),
      username: formData.get("username"),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your sign-in details");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSignIn(result.data);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page min-h-screen bg-[var(--navy-950)]">
      <div className="login-orbit login-orbit-one" aria-hidden="true" />
      <div className="login-orbit login-orbit-two" aria-hidden="true" />

      <section className="login-story" aria-labelledby="login-story-title">
        <img alt="PACD" className="login-brand" src="/logo_left.png" />
        <div className="login-story-copy">
          <p className="type-overline text-blue-100/65">PACD WorkPilot</p>
          <h1 className="login-title" id="login-story-title">Work stays clear when everything is connected.</h1>
          <p className="login-intro">
            Keep project updates, requests, and claims in one focused workspace built for the way your team works.
          </p>
        </div>

        <div className="login-flow" aria-label="WorkPilot capabilities">
          <article className="login-flow-item">
            <span className="login-flow-icon"><FolderKanban aria-hidden="true" size={18} /></span>
            <span><strong>Plan work</strong><small>Projects and activity</small></span>
          </article>
          <span className="login-flow-line" aria-hidden="true" />
          <article className="login-flow-item">
            <span className="login-flow-icon"><FileCheck2 aria-hidden="true" size={18} /></span>
            <span><strong>Review clearly</strong><small>Claims and requests</small></span>
          </article>
          <span className="login-flow-line" aria-hidden="true" />
          <article className="login-flow-item">
            <span className="login-flow-icon"><ShieldCheck aria-hidden="true" size={18} /></span>
            <span><strong>Stay accountable</strong><small>Permissions and audit</small></span>
          </article>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="sign-in-title">
        <div className="login-card">
          <div>
            <p className="type-overline text-[var(--navy-500)]">Employee workspace</p>
            <h2 className="login-card-title" id="sign-in-title">Welcome back</h2>
            <p className="type-body mt-2 text-[var(--muted)]">Sign in with the username provided by your administrator.</p>
          </div>

          <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
            <div>
              <label className="type-label block text-[var(--navy-900)]" htmlFor="username">Username</label>
              <input
                autoComplete="username"
                className="login-input"
                id="username"
                name="username"
                placeholder="e.g. emp-001"
                spellCheck={false}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="type-label block text-[var(--navy-900)]" htmlFor="password">Password</label>
                <span className="type-caption text-[var(--muted)]">Invite-only access</span>
              </div>
              <div className="relative mt-2">
                <input
                  autoComplete="current-password"
                  className="login-input mt-0 pr-12"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
                </button>
              </div>
            </div>

            {error ? <p className="login-error" role="alert">{error}</p> : null}

            <button className="login-submit" disabled={isSubmitting} type="submit">
              <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>

          <div className="login-help">
            <p>Forgot your password or need access?</p>
            <p>Contact your Super Admin. Public registration is disabled.</p>
          </div>

          {onPreview ? (
            <button className="login-preview" onClick={onPreview} type="button">Open development preview</button>
          ) : null}
        </div>
        <p className="type-caption mt-5 text-center text-blue-100/60">Authorized PACD personnel only</p>
      </section>
    </main>
  );
}
