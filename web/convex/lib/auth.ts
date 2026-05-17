import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

type AuthResult = {
  identity: { subject: string; email?: string; name?: string };
  user: Doc<"authorizedUsers">;
  userId: string;
};

/**
 * Require authentication and authorization. Returns the identity and the
 * authorizedUsers record. Throws if the caller is not signed in or has not
 * been provisioned as the workspace owner.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<AuthResult> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthenticated: must be signed in");
  }
  const authId = userId as string;

  const user = await ctx.db
    .query("authorizedUsers")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .first();

  if (!user) {
    throw new Error("Unauthorized: not the workspace owner");
  }

  const identity = await ctx.auth.getUserIdentity();
  return {
    identity: { subject: authId, email: identity?.email, name: identity?.name },
    user,
    userId: authId,
  };
}

export async function requireIdentity(
  ctx: ActionCtx,
): Promise<{ subject: string; email?: string; name?: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: must be signed in");
  }
  const [userId] = identity.subject.split("|");
  return { subject: userId, email: identity.email, name: identity.name };
}
