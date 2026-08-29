"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { signInAction, signInWithGoogleAction, signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginCharacterScene, type LoginCharacterMood } from "./login-character-scene";

export function AuthForm({
  mode,
  error,
  success,
  next,
}: {
  mode: "login" | "register";
  error?: string;
  success?: string;
  next?: string;
}) {
  const isLogin = mode === "login";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [activeField, setActiveField] = useState<"email" | "password" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mood: LoginCharacterMood = error && !isSubmitting
    ? "error"
    : isSubmitting
      ? "loading"
      : passwordVisible
        ? "peeking"
        : activeField === "password"
          ? "hiding"
          : activeField === "email"
            ? "watching"
            : "idle";

  const handleSubmit = () => {
    setIsSubmitting(true);
  };

  return (
    <main className="auth-page">
      <div className={`auth-shell${isLogin ? "" : " auth-shell--register"}`}>
        <section className="auth-art" aria-label="POSKART workspace">
          <Link href="/" className="auth-brand">
            <span className="auth-brand__mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo Poskart.png" alt="" className="size-8 object-contain" />
            </span>
            <span>
              <strong>POSKART</strong>
              <small>merchant workspace</small>
            </span>
          </Link>
          <LoginCharacterScene mood={mood} />
          <p className="auth-art__footer">Simple tools for busy counters.</p>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__inner">
            <div className="auth-mobile-brand">
              <span className="auth-brand__mark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Logo Poskart.png" alt="POSKART" className="size-8 object-contain" />
              </span>
              <strong>POSKART</strong>
            </div>
            <div className="auth-heading">
              <div className="auth-heading__spark"><span>*</span></div>
              <p className="auth-kicker">{isLogin ? "Welcome back" : "Get started"}</p>
              <h1>{isLogin ? "Keep your business moving." : "Set up your workspace."}</h1>
              <p>{isLogin ? "Sign in to manage your store, devices, and daily sales." : "Create an account for POSKART dashboard access."}</p>
            </div>

            {error ? (
              <div className="auth-message auth-message--error" role="alert" aria-live="assertive">
                <LockKeyhole className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {success ? (
              <div className="auth-message auth-message--success" role="status" aria-live="polite">{success}</div>
            ) : null}

            <form action={signInWithGoogleAction} onSubmit={() => setIsSubmitting(true)}>
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <Button className="auth-google-button" size="lg" type="submit" variant="outline" disabled={isSubmitting}>
                <span className="auth-google-mark">G</span>
                Continue with Google
              </Button>
            </form>

            <div className="auth-divider"><span>or continue with email</span></div>

            <form action={isLogin ? signInAction : signUpAction} className="auth-form" onSubmit={handleSubmit}>
              {next ? <input type="hidden" name="next" value={next} /> : null}
              {!isLogin ? (
                <label className="auth-field">
                  <span>Full name</span>
                  <Input name="fullName" placeholder="POSKART Photobooth" required autoComplete="name" />
                </label>
              ) : null}
              <label className="auth-field">
                <span>Email</span>
                <Input
                  name="email"
                  type="email"
                  placeholder="admin@poskart.id"
                  required
                  autoComplete="email"
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <span className="auth-password-wrap">
                  <Input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField(null)}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    aria-pressed={passwordVisible}
                  >
                    {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>
              <Button className="auth-submit-button" size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {isSubmitting ? "Checking..." : isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="auth-switch">
              {isLogin ? "Do not have an account?" : "Already have an account?"}{" "}
              <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Create one" : "Sign in"}</Link>
            </p>
          </div>
          <p className="auth-panel__legal">By continuing, you agree to use POSKART for your business operations.</p>
        </section>
      </div>
    </main>
  );
}
