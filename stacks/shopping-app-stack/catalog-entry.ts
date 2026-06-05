// Paste this object into MARKETPLACE_STACK_LISTINGS in:
//   zencore/packages/shared/src/marketplace.ts
// IDs must match: this `id` ↔ stack.json `id` ↔ tenant-templates folder name.
// Keep reviewStatus: "review" until admin approval, then set status: "available".

{
  id: "shopping-app-stack",
  name: "Shopping App",
  eyebrow: "Standalone agent",
  category: "Shopping",
  summary:
    "Autonomous shopping assistant on a dedicated server. Searches Tesco, Sainsbury's, Amazon, and eBay — compares prices, manages a shared basket, and remembers dietary requirements and budget preferences. Powered by Claude.",
  outcome: "Your personal shopper — finds, compares, and baskets items across four UK retailers",
  stackPath: "stacks/shopping-app-stack",
  componentSummary: ["claude-sonnet", "shopping-tools", "react-ui"],
  packagingMode: "stack",
  deploymentProfile: "claude-shopping",
  reviewStatus: "review",
  status: "coming_soon",
  priceModel: "subscription",
  version: "0.1.0",
  requiredCredentials: ["anthropic_api_key"],
  capabilities: [
    "Natural language product search across Tesco, Sainsbury's, Amazon, and eBay",
    "Cross-store price comparison",
    "Persistent basket with per-store checkout links",
    "Saves dietary requirements, budget limits, and preferred stores",
    "Callable from OS1 voice agent and other ZenCore agents",
  ],
  dashboardModules: [{ id: "shopping", label: "Shopping", href: "/" }],
  firstParty: true,
  productKind: "standalone",
}
