import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth } from "./lib/auth";

/** Get the current user's authorizedUsers row, or null if not yet provisioned. */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const authId = userId as string;
    return await ctx.db
      .query("authorizedUsers")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
  },
});

/** Has anyone been provisioned as the owner yet? */
export const hasOwner = query({
  args: {},
  handler: async (ctx) => {
    const owner = await ctx.db
      .query("authorizedUsers")
      .filter((q) => q.eq(q.field("role"), "owner"))
      .first();
    return !!owner;
  },
});

/**
 * First-time owner provisioning. Called by AuthGuard on the very first login.
 * Seeds the default comment bank on completion.
 */
export const provisionOwner = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const identity = await ctx.auth.getUserIdentity();
    const authId = userId as string;

    const existingOwner = await ctx.db
      .query("authorizedUsers")
      .filter((q) => q.eq(q.field("role"), "owner"))
      .first();
    if (existingOwner) {
      throw new Error("Workspace already has an owner");
    }

    const existing = await ctx.db
      .query("authorizedUsers")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (existing) return existing;

    const newId = await ctx.db.insert("authorizedUsers", {
      authId,
      email: identity?.email ?? "",
      name: identity?.name ?? "",
      picture: (identity?.pictureUrl ?? identity?.picture) as string | undefined,
      role: "owner",
    });

    // Comment banks are imported from a spreadsheet via /import — no seed here.

    return await ctx.db.get(newId);
  },
});

/** Update digest email addresses (Settings page). */
export const updateDigestAddresses = mutation({
  args: {
    digestFromAddress: v.optional(v.string()),
    digestToAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await ctx.db.patch(user._id, {
      digestFromAddress: args.digestFromAddress,
      digestToAddress: args.digestToAddress,
    });
    return await ctx.db.get(user._id);
  },
});

/** Internal: lookup by authId (for actions). */
export const getUserByAuthId = internalQuery({
  args: { authId: v.string() },
  handler: async (ctx, { authId }) => {
    return await ctx.db
      .query("authorizedUsers")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
  },
});
