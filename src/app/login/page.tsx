import { pageMetadata } from "@/lib/seo";
import { LoginPage } from "@/components/login/LoginPage";

export const metadata = pageMetadata({
  title: "Sign In",
  description: "Secure access portal for IM One intelligent operations.",
  path: "/login",
});

export default function LoginRoute() {
  return <LoginPage />;
}
