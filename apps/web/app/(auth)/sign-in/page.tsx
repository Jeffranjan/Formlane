"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { trpc } from "~/trpc/client";
import { AuthCard, AuthDivider } from "~/components/auth/auth-card";
import { GoogleIcon } from "~/components/auth/google-icon";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const googleStartQuery = trpc.auth.googleStart.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (googleStartQuery.data?.url) setGoogleUrl(googleStartQuery.data.url);
  }, [googleStartQuery.data]);

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: (error) => {
      setServerError(
        error.message === "invalid_credentials"
          ? "Invalid email or password."
          : "Something went wrong. Please try again.",
      );
    },
  });

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInValues) {
    setServerError(null);
    signInMutation.mutate(values);
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue building beautiful forms."
      footer={
        <>
          Don't have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={signInMutation.isPending}
          >
            {signInMutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>

      {googleUrl && (
        <>
          <AuthDivider>or continue with</AuthDivider>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => (window.location.href = googleUrl)}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>
        </>
      )}
    </AuthCard>
  );
}
