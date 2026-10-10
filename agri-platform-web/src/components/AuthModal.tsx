// src/components/AuthModal.tsx
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { isAxiosError } from "axios";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { X } from "lucide-react";
import TimedNotice from "./TimedNotice";

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("farmer");
  const [county, setCounty] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if ((mode === "register" || mode === "reset") && password.length !== 8) {
      setError("Password must be exactly 8 characters long.");
      return;
    }

    try {
      if (mode === "forgot") {
        const response = await API.post("/auth/forgot-password", {
          phone_number: phone,
        });
        setVerificationCode("");
        setMode("reset");
        setError(response.data.message);
      } else if (mode === "reset") {
        const response = await API.post("/auth/reset-password", {
          phone_number: phone,
          verification_code: verificationCode,
          new_password: password,
        });
        setPassword("");
        setVerificationCode("");
        setMode("login");
        setError(response.data.message);
      } else if (mode === "login") {
        const response = await API.post("/auth/login", {
          phone_number: phone,
          password,
        });
        login(response.data.token, response.data.user);
        onClose();
      } else {
        await API.post("/auth/register", {
          full_name: fullName,
          phone_number: phone,
          password,
          role,
          county,
        });
        setMode("login");
        setError("Registration successful! Please log in.");
      }
    } catch (err: unknown) {
      const responseMessage = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(
        responseMessage || "Authentication failed. Please check your inputs.",
      );
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  const isRegistration = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const isLogin = mode === "login";
  const isSuccess =
    error.startsWith("Registration successful") ||
    error.startsWith("If the number is registered") ||
    error.startsWith("Your password has been reset");

  return createPortal(
    <div className="auth-modal-overlay">
      <div
        className="auth-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="auth-modal-close"
          aria-label="Close authentication form"
        >
          <X size={20} />
        </button>

        <h2 id="auth-modal-title" className="auth-modal-title">
          {isLogin
            ? "Login to AgriShare"
            : isRegistration
              ? "Register Account"
              : isForgot
                ? "Forgot password"
                : "Reset your password"}
        </h2>

        {error && (
          <TimedNotice
            key={error}
            message={error}
            type={isSuccess ? "success" : "error"}
            onDismiss={() => setError("")}
          />
        )}

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {isRegistration && (
            <>
              <div className="auth-modal-field">
                <label htmlFor="auth-full-name">
                  Full Name
                </label>
                <input
                  id="auth-full-name"
                  type="text"
                  autoComplete="name"
                  maxLength={255}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <small className="auth-modal-counter" aria-live="polite">
                  {255 - fullName.length} characters remaining
                </small>
              </div>
              <div className="auth-modal-field">
                <label htmlFor="auth-role">
                  Role
                </label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="farmer">Small-scale Farmer</option>
                  <option value="equipment_owner">Equipment Owner</option>
                </select>
              </div>
              <div className="auth-modal-field">
                <label htmlFor="auth-county">
                  County (e.g., Kiambu, Nakuru)
                </label>
                <input
                  id="auth-county"
                  type="text"
                  autoComplete="address-level1"
                  maxLength={100}
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                />
                <small className="auth-modal-counter" aria-live="polite">
                  {100 - county.length} characters remaining
                </small>
              </div>
            </>
          )}

          <div className="auth-modal-field">
            <label htmlFor="auth-phone">
              Phone Number (M-Pesa enabled)
            </label>
            <input
              id="auth-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={13}
              pattern="(?:0[17][0-9]{8}|\+254[17][0-9]{8})"
              placeholder="+254712345678"
              value={phone}
              onChange={(e) => {
                const input = e.target.value;
                const hasLeadingPlus = input.startsWith("+");
                const digits = input.replace(/\D/g, "").slice(0, 12);
                setPhone(`${hasLeadingPlus ? "+" : ""}${digits}`);
              }}
              required
            />
            <small className="auth-modal-counter" aria-live="polite">
              {phone.startsWith("+254")
                ? `${13 - phone.length} characters remaining (13 max)`
                : `${Math.max(0, 10 - phone.length)} digits remaining (10 local digits or +254 country code)`}
            </small>
          </div>

          {isReset && (
            <div className="auth-modal-field">
              <label htmlFor="auth-verification-code">SMS verification code</label>
              <input
                id="auth-verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                required
              />
              <small className="auth-modal-counter" aria-live="polite">
                {6 - verificationCode.length} digits remaining (6 required)
              </small>
            </div>
          )}

          {!isForgot && (
            <div className="auth-modal-field">
              <label htmlFor="auth-password">
                {isReset ? "New password" : "Password"}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={isLogin ? undefined : 8}
                maxLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <small className="auth-modal-counter" aria-live="polite">
                {8 - password.length} characters remaining (8 maximum)
              </small>
              {!isLogin && (
                <small className="auth-modal-hint">
                  Use exactly 8 characters.
                </small>
              )}
            </div>
          )}

          <button
            type="submit"
            className="auth-modal-submit"
          >
            {isLogin
              ? "Login"
              : isRegistration
                ? "Register"
                : isForgot
                  ? "Send verification code"
                  : "Reset password"}
          </button>
        </form>

        {isLogin && (
          <button
            type="button"
            className="auth-modal-forgot-link"
            onClick={() => {
              setMode("forgot");
              setError("");
            }}
          >
            Forgot password?
          </button>
        )}
        {isForgot && (
          <p className="auth-modal-recovery-note">
            If this number is registered, we’ll send a code that expires in 10 minutes.
          </p>
        )}
        <div className="auth-modal-switch">
          {mode === "login" || isRegistration ? (
            <>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={switchMode}>
                {isLogin ? "Register here" : "Login here"}
              </button>
            </>
          ) : (
            <>
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
