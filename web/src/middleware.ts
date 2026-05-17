import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

// Handles OAuth code exchange (setting auth cookies on this Next.js origin).
// Route protection is handled client-side by AuthGuard.
export default convexAuthNextjsMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
