import type { ReactNode } from "react";
import SiteHeader, { MobileNav, SiteFooter } from "@/components/SiteHeader";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-auto">{children}</div>
      <SiteFooter />
      <MobileNav />
    </div>
  );
}
