import { SignIn } from "@clerk/react-router";
import { getAuth } from "@clerk/react-router/server";
import { redirect } from "react-router";
import type { Route } from "./+types/sign-in";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  // If user is already signed in, redirect to home
  if (userId) {
    return redirect("/");
  }

  return null;
}

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <SignIn />
    </div>
  );
}
