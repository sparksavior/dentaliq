import { notFound } from "next/navigation";

// Demo routes are disabled in production unless NEXT_PUBLIC_ENABLE_DEMO=true
// This prevents unauthenticated access to demo data in live deployments.
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO !== "true"
  ) {
    notFound();
  }

  return <>{children}</>;
}
