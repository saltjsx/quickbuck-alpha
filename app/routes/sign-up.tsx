import { SignUp } from "@clerk/react-router";
import { track } from "@databuddy/sdk";
import { useEffect } from "react";

export default function SignUpPage() {
  useEffect(() => {
    track("sign_up_page_viewed", {
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <SignUp />
    </div>
  );
}
