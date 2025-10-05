import { SignIn } from "@clerk/react-router";
import { track } from "@databuddy/sdk";
import { useEffect } from "react";

export default function SignInPage() {
  useEffect(() => {
    track("sign_in_page_viewed", {
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <SignIn />
    </div>
  );
}
