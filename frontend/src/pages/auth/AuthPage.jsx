import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { loginUser, registerUser, getCurrentUser } from "@/services/auth.service";
import { setUser } from "@/store/authSlice";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const isLogin = mode === "login";

  const dispatch = useDispatch();

  /* ================= LOGIN ================= */

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    setError: setLoginError,
    clearErrors: clearLoginErrors,
    reset: resetLogin,
    formState: { errors: loginErrors, isSubmitting: loginLoading },
  } = useForm({ mode: "onSubmit" });

  const onLogin = async (data) => {
    try {
      // login → sets cookie
      await loginUser(data);

      // sync user (source of truth)
      const res = await getCurrentUser();

      dispatch(setUser(res.data));

      // ✅ NO navigation (handled by AuthLayout + Redux state)

    } catch (err) {
      const message = err.message?.toLowerCase() || "";

      if (message.includes("password")) {
        setLoginError("password", { message: err.message });
      } else if (message.includes("email") || message.includes("username")) {
        setLoginError("identifier", { message: err.message });
      } else {
        setLoginError("root", { message: err.message });
      }
    }
  };

  /* ================= REGISTER ================= */

  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    setError: setRegisterError,
    clearErrors: clearRegisterErrors,
    reset: resetRegister,
    formState: { errors: registerErrors, isSubmitting: registerLoading },
  } = useForm({ mode: "onSubmit" });

  const onRegister = async (data) => {
    try {
      await registerUser(data);

      // get fresh user
      const res = await getCurrentUser();

      dispatch(setUser(res.data));

    } catch (err) {
      setRegisterError("root", { message: err.message });
    }
  };

  /* ================= TOGGLE ================= */

  const toggleMode = () => {
    clearLoginErrors();
    clearRegisterErrors();
    resetLogin();
    resetRegister();
    setMode(isLogin ? "register" : "login");
  };

  /* ================= RETURN UI (same as yours) ================= */


  return (
    <div className="min-h-screen flex items-center justify-center bg-background-app">
      <div className="relative w-[900px] h-[550px] bg-surface-base rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 z-10 flex">
          {/* LOGIN */}
          <FormShell visible={isLogin}>
            <AuthForm
              title="Sign In"
              button="Sign In"
              loading={loginLoading}
              error={loginErrors.root?.message}
              onSubmit={handleLoginSubmit(onLogin)}
            >
              <Input
                label="Email or Username"
                error={loginErrors.identifier?.message}
                {...loginRegister("identifier", {
                  required: "Email or username required",
                  onChange: () => clearLoginErrors("identifier"),
                })}
              />

              <Input
                label="Password"
                type="password"
                error={loginErrors.password?.message}
                {...loginRegister("password", {
                  required: "Password required",
                  onChange: () => clearLoginErrors("password"),
                })}
              />
            </AuthForm>
          </FormShell>

          {/* REGISTER */}
          <FormShell visible={!isLogin}>
            <AuthForm
              title="Create Account"
              button="Sign Up"
              loading={registerLoading}
              error={registerErrors.root?.message}
              onSubmit={handleRegisterSubmit(onRegister)}
            >
              <Input
                label="Username"
                error={registerErrors.username?.message}
                {...registerRegister("username", {
                  required: "Username required",
                  onChange: () => clearRegisterErrors("username"),
                })}
              />

              <Input
                label="Email"
                error={registerErrors.email?.message}
                {...registerRegister("email", {
                  required: "Email required",
                  onChange: () => clearRegisterErrors("email"),
                })}
              />

              <Input
                label="Password"
                type="password"
                error={registerErrors.password?.message}
                {...registerRegister("password", {
                  required: "Password required",
                  onChange: () => clearRegisterErrors("password"),
                })}
              />
            </AuthForm>
          </FormShell>
        </div>

        {/* SLIDER */}
        <div
          className={`
            absolute top-0 h-full w-1/2 z-20 flex items-center justify-center
            bg-gradient-to-br from-brand-primary to-brand-secondary
            transition-transform duration-700 ease-in-out
            ${isLogin ? "translate-x-full" : "translate-x-0"}
          `}
        >
          <CTA
            show={isLogin}
            title="Hello, Friend!"
            text="Create account to get started"
            action="Sign Up"
            onClick={toggleMode}
            exit="left"
          />
          <CTA
            show={!isLogin}
            title="Welcome Back!"
            text="Sign in to continue"
            action="Sign In"
            onClick={toggleMode}
            exit="right"
          />
        </div>
      </div>
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

function FormShell({ visible, children }) {
  return (
    <div
      className={`w-1/2 flex items-center justify-center px-14 transition-all
        ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {children}
    </div>
  );
}

function AuthForm({ title, children, button, loading, error, onSubmit }) {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full space-y-4 text-center text-text-primary"
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
      {error && <p className="text-sm text-status-error">{error}</p>}
      <button
        disabled={loading}
        className="w-full py-3 rounded-full bg-brand-primary text-text-inverse"
      >
        {loading ? "Please wait..." : button}
      </button>
    </form>
  );
}

function CTA({ show, title, text, action, onClick, exit }) {
  return (
    <div
      className={`absolute text-center text-text-inverse transition-all duration-700
        ${
          show
            ? "opacity-100"
            : `opacity-0 ${
                exit === "left" ? "-translate-x-full" : "translate-x-full"
              }`
        }`}
    >
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="mb-6 text-text-inverse/90">{text}</p>
      <button
        type="button"
        onClick={onClick}
        className="border border-text-inverse/70 px-8 py-3 rounded-full"
      >
        {action}
      </button>
    </div>
  );
}

function Input({ label, error, type = "text", ...props }) {
  return (
    <div className="text-left">
      <label className="block text-sm mb-1 text-text-secondary">{label}</label>
      <input
        type={type}
        {...props}
        className="w-full px-4 py-3 rounded-xl bg-background-app text-text-primary"
      />
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  );
}
