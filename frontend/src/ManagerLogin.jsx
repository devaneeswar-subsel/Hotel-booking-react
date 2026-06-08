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

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user && (data.user.role === "manager" || data.user.role === "admin")) {
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
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.user.role !== "manager" && data.user.role !== "admin") {
        throw new Error("Access denied. Manager accounts only.");
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1923]">
        <div className="font-['Playfair_Display'] text-[1.2rem] text-[#C9A84C] tracking-[2px]">
          VV GRAND PARK
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1923] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] relative">
      {/* Background pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-100"
        style={{
          backgroundImage: "radial-gradient(rgba(201,168,76,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-9">
          <div className="w-16 h-16 bg-[#C9A84C1F] border-[1.5px] border-[#C9A84C4D] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#C9A84C">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="font-['Playfair_Display'] text-2xl font-bold text-[#C9A84C] tracking-[3px] mb-1">
            VV GRAND PARK
          </div>
          <div className="text-[0.7rem] text-white/40 tracking-[4px] uppercase">
            Residency
          </div>
          <div className="mt-4 text-[0.82rem] text-white/40 tracking-wider">
            Manager Portal
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-[#C9A84C26] rounded-[20px] p-8 backdrop-blur-md">
          <h2 className="font-['Playfair_Display'] text-[1.2rem] font-semibold text-white mb-1.5">
            Welcome Back
          </h2>
          <p className="text-[0.78rem] text-white/40 mb-7">
            Sign in to your manager account
          </p>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-[0.82rem] text-[#E74C3C] mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[0.62rem] font-bold text-white/40 mb-2 tracking-[1.5px] uppercase">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="manager@vvgrandpark.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-3 rounded-lg border border-white/10 bg-white/5 text-white text-[0.875rem] outline-none transition-colors focus:border-[#C9A84C80]"
              />
            </div>

            <div className="relative">
              <label className="block text-[0.62rem] font-bold text-white/40 mb-2 tracking-[1.5px] uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-3.5 pr-11 py-3 rounded-lg border border-white/10 bg-white/5 text-white text-[0.875rem] outline-none transition-colors focus:border-[#C9A84C80]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 mt-2 rounded-lg font-bold text-[0.9rem] tracking-[0.5px] transition-all
                ${loading 
                  ? "bg-[#C9A84C80] cursor-not-allowed text-[#0F1923]/70" 
                  : "bg-[#C9A84C] text-[#0F1923] hover:opacity-90 active:scale-[0.98]"
                }`}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        </div>

        <footer className="text-center mt-5 text-[0.72rem] text-white/20">
          VV Grand Park Residency · Manager Access Only
        </footer>
      </div>
    </div>
  );
}