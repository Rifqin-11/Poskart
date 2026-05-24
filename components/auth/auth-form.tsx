import Link from "next/link";
import { Camera, LockKeyhole } from "lucide-react";
import { signInAction, signInWithGoogleAction, signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({
  mode,
  error,
  success,
}: {
  mode: "login" | "register";
  error?: string;
  success?: string;
}) {
  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 flex items-center gap-3 self-center">
          <div className="grid size-10 place-items-center rounded-lg bg-zinc-950 text-white">
            <Camera className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">POSKART</div>
            <div className="text-xs text-zinc-500">Admin authentication</div>
          </div>
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-lg bg-zinc-100">
              <LockKeyhole className="size-5 text-zinc-700" />
            </div>
            <CardTitle className="text-xl">{isLogin ? "Sign in to POSKART" : "Create POSKART account"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Access dashboard, builder, transactions, and booth operations."
                : "Create an admin account for POSKART dashboard access."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <form action={signInWithGoogleAction}>
              <Button className="w-full" size="lg" type="submit" variant="outline">
                <span className="grid size-4 place-items-center rounded-full bg-white text-[11px] font-bold text-[#4285F4]">
                  G
                </span>
                Continue with Google
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs text-zinc-400">or continue with email</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <form action={isLogin ? signInAction : signUpAction} className="space-y-4">
              {!isLogin ? (
                <label className="block text-xs font-medium text-zinc-500">
                  Full name
                  <Input className="mt-1" name="fullName" placeholder="POSKART Admin" required />
                </label>
              ) : null}
              <label className="block text-xs font-medium text-zinc-500">
                Email
                <Input className="mt-1" name="email" type="email" placeholder="admin@poskart.id" required />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                Password
                <Input className="mt-1" name="password" type="password" placeholder="Minimum 8 characters" required minLength={8} />
              </label>
              <Button className="w-full" size="lg" type="submit">
                {isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-zinc-500">
              {isLogin ? "Do not have an account?" : "Already have an account?"}{" "}
              <Link href={isLogin ? "/register" : "/login"} className="font-medium text-zinc-950 underline-offset-4 hover:underline">
                {isLogin ? "Create one" : "Sign in"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
