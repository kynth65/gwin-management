export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/orders/:path*", "/automations/:path*", "/settings/:path*", "/users/:path*", "/tasks/:path*"],
};
