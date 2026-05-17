"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert, GraduationCap } from "lucide-react";

/**
 * Single-user variant of the auth guard. On first successful login, the
 * authenticated user is auto-provisioned as the workspace `owner`.
 * Public routes: /sign-in
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  const isPublicRoute = pathname?.startsWith("/sign-in");

  const currentUser = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const hasOwner = useQuery(api.users.hasOwner, isAuthenticated ? {} : "skip");
  const provisionOwner = useMutation(api.users.provisionOwner);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  useEffect(() => {
    if (
      isAuthenticated &&
      hasOwner === false &&
      currentUser === null &&
      !isProvisioning
    ) {
      setIsProvisioning(true);
      provisionOwner({})
        .catch((err) => {
          setProvisionError(err instanceof Error ? err.message : "Failed to provision owner");
        })
        .finally(() => setIsProvisioning(false));
    }
  }, [isAuthenticated, hasOwner, currentUser, isProvisioning, provisionOwner]);

  useEffect(() => {
    if (!isConvexLoading && !isAuthenticated && !isPublicRoute) {
      router.replace("/sign-in");
    }
  }, [isConvexLoading, isAuthenticated, isPublicRoute, router]);

  if (isPublicRoute) return <>{children}</>;
  if (isConvexLoading) return <LoadingScreen message="Connecting..." />;
  if (!isAuthenticated) return <LoadingScreen message="Redirecting to login..." />;
  if (currentUser === undefined || hasOwner === undefined) return <LoadingScreen message="Loading workspace..." />;
  if (isProvisioning) return <LoadingScreen message="Setting up your workspace..." />;
  if (provisionError) {
    return <ErrorScreen title="Setup error" message={provisionError} onSignOut={() => void signOut()} />;
  }
  if (currentUser === null && hasOwner) {
    return (
      <ErrorScreen
        title="Access denied"
        message="This is a single-user workspace; only the owner can sign in here."
        onSignOut={() => void signOut()}
      />
    );
  }

  return <>{children}</>;
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({
  title,
  message,
  onSignOut,
}: {
  title: string;
  message: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex max-w-md flex-col items-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          onClick={onSignOut}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
