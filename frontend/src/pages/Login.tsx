import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <Logo className="h-10 w-10 text-foreground" />
          </div>
          <CardTitle className="text-xl lowercase">praxis</CardTitle>
          <CardDescription>Sign in to the compliance platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            <Button
              type="button"
              variant="secondary"
              className="w-full mt-2"
              onClick={handleDemoLogin}
              disabled={demoLoading || loading}
            >
              {demoLoading ? "Signing in…" : "Try Demo"}
            </Button>
          )}
          {import.meta.env.DEV && (
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Demo: admin@praxis.local / admin123
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
