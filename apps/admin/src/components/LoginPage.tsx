// LoginPage
// Simple development login page used to gate the admin UI.
// - Uses `login(password)` from the local DB to perform dev auth (non-secure)
// - Calls `onLoginSuccess` when login succeeds
import { useState } from "react";
import { login } from "../db";
import "./LoginPage.css";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle login form submission: call the dev login function and simulate a
  // brief async delay. If successful, reset form and notify parent. Otherwise,
  // show an error message.
  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = login(password);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async login delay
    if (success) {
      setPassword("");
      onLoginSuccess();
    } else {
      setError("Invalid password. Please try again.");
      setPassword("");
    }
    
    setIsLoading(false);
  };

  // Render the login form with a password input, error message display, and a
  // submit button that becomes disabled during async login.
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
