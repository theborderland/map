import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import "../css/LoginPage.css";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(password);
    setPassword("");
    if (!result.ok) setError(result.error);

    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Map Admin</h1>
        <p className="login-subtitle">Enter password to continue</p>
        development password: <code>dev</code>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}