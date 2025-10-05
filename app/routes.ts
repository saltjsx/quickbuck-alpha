import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/accounts", "routes/dashboard/accounts.tsx"),
    route("dashboard/leaderboard", "routes/dashboard/leaderboard.tsx"),
    route("dashboard/companies/:companyId", "routes/dashboard/companies.$companyId.tsx"),
    route("dashboard/companies", "routes/dashboard/companies.tsx"),
    route("dashboard/marketplace", "routes/dashboard/marketplace.tsx"),
    route("dashboard/stocks/:companyId", "routes/dashboard/stocks.$companyId.tsx"),
    route("dashboard/stocks", "routes/dashboard/stocks.tsx"),
    route("dashboard/portfolio", "routes/dashboard/portfolio.tsx"),
    route("dashboard/transactions", "routes/dashboard/transactions.tsx"),
    route("dashboard/history", "routes/dashboard/history.tsx"),
  ]),
] satisfies RouteConfig;
