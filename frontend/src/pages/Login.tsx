import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Login() {
  const { login, ssoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const ssoEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_SSO === "true";
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL || (import.meta.env.DEV ? "admin@praxis.local" : "");
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || (import.meta.env.DEV ? "admin123" : "");
  const demoEnabled = Boolean(demoEmail && demoPassword);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("sso_token");
    if (!token) return;
    const rawUser = params.get("sso_user");
    let user;
    try {
      user = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      user = null;
    }
    if (user && user.email) {
      ssoLogin(token, user);
      window.history.replaceState({}, "", "/login");
      navigate("/", { replace: true });
    } else {
      setError("SSO sign-in failed. Try again.");
    }
  }, [ssoLogin, navigate]);

  const startSso = () => {
    window.location.href = "/api/auth/sso/authorize";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Real login through the same /api/auth/login flow as the form above, with the
  // seeded demo admin's credentials filled in automatically, so evaluators can get in
  // with one click instead of typing/copying admin@praxis.local / admin123.
  const handleDemoLogin = async () => {
    setError("");
    setDemoLoading(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Praxis home">
          <Logo className="h-7 w-7 text-foreground" />
          <span className="text-lg font-semibold tracking-tight lowercase">praxis</span>
        </Link>
        <Link to="/tour" className="ml-auto text-sm text-muted-foreground hover:text-foreground">Product tour</Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 pb-20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <Logo className="h-10 w-10 text-foreground" />
          </div>
          <CardTitle className="text-xl">Sign in to Praxis</CardTitle>
          <CardDescription>Open the compliance operations workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
            )}
            <label htmlFor="email" className="block text-left text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
            <label htmlFor="password" className="block pt-1 text-left text-sm font-medium">Password</label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          {(ssoEnabled || demoEnabled) && (
            <div className="flex items-center gap-2 my-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {ssoEnabled && (
            <Button type="button" variant="outline" className="w-full" onClick={startSso}>
              Sign in with SSO (Keycloak)
            </Button>
          )}
          {demoEnabled && (
            <div className="mt-3 rounded-xl border bg-secondary/60 p-3">
              <div className="mb-2 text-left text-xs font-medium">Demo credentials</div>
              <dl className="space-y-1.5 text-left text-xs">
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd><code>{demoEmail}</code></dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Password</dt><dd><code>{demoPassword}</code></dd></div>
              </dl>
              <Button
                type="button"
                variant="secondary"
                className="w-full mt-3 border"
                onClick={handleDemoLogin}
                disabled={demoLoading || loading}
              >
                {demoLoading ? "Signing in…" : "Use demo account"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
