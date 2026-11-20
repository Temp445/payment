import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[var(--background)]">
        {/* Desktop & Mobile Responsive Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
