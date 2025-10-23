import { redirect } from "react-router";

export function loader() {
  // Dashboard removed — redirect to home
  throw redirect("/");
}

export default function DashboardLayout() {
  return null;
}
