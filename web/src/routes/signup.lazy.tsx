import { createLazyFileRoute } from "@tanstack/react-router";

import { SignupPage } from "@/pages/signup";

export const Route = createLazyFileRoute("/signup")({
  component: SignupPage,
});
