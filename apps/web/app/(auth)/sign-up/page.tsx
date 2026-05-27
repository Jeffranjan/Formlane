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

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().optional(),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const googleStartQuery = trpc.auth.googleStart.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (googleStartQuery.data?.url) setGoogleUrl(googleStartQuery.data.url);
  }, [googleStartQuery.data]);

  const signUpMutation = trpc.auth.signUp.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: (error) => {
      setServerError(
        error.message === "email_already_in_use"
          ? "An account with this email already exists."
          : "Something went wrong. Please try again.",
      );
    },
  });

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  function onSubmit(values: SignUpValues) {
    setServerError(null);
    signUpMutation.mutate(values);
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start collecting beautiful responses in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Jane Doe"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
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
            disabled={signUpMutation.isPending}
          >
            {signUpMutation.isPending ? "Creating account…" : "Create account"}
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

      <p className="text-center text-[11px] text-muted-foreground/70">
        By creating an account you agree to our terms and privacy policy.
      </p>
    </AuthCard>
  );
}
