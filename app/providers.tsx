"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          className: "!bg-surface !text-foreground !border !border-border !rounded-2xl !shadow-lg",
        }}
      />
    </ThemeProvider>
  );
}
