import React, { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL;

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

export default function ManagerLogin({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if already logged in as manager
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (
          data.user &&
          (data.user.role === "manager" || data.user.role === "admin")
        ) {
          onLogin(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [onLogin]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/manager/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1923",
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.2rem",
            color: "#C9A84C",
            letterSpacing: "2px",
          }}
        >
          VV GRAND PARK
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F1923",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(201,168,76,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "rgba(201,168,76,0.12)",
              border: "1.5px solid rgba(201,168,76,0.3)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#C9A84C">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#C9A84C",
              letterSpacing: "3px",
              marginBottom: 4,
            }}
          >
            VV GRAND PARK
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            RESIDENCY
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "1px",
            }}
          >
            Manager Portal
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(201,168,76,0.15)",
            borderRadius: 20,
            padding: "32px 28px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "#fff",
              marginBottom: 6,
            }}
          >
            Welcome Back
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 28,
            }}
          >
            Sign in to your manager account
          </div>

          {error && (
            <div
              style={{
                background: "rgba(192,57,43,0.15)",
                border: "1px solid rgba(192,57,43,0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.82rem",
                color: "#E74C3C",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 8,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="manager@vvgrandpark.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(201,168,76,0.5)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 8,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(201,168,76,0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "1rem",
                    padding: 0,
                  }}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 8,
                background: loading ? "rgba(201,168,76,0.5)" : "#C9A84C",
                color: "#0F1923",
                border: "none",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.5px",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          VV Grand Park Residency · Manager Access Only
        </div>
      </div>
    </div>
  );
}
