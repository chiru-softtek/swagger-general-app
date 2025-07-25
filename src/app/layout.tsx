"use client";

import { ReactNode, useEffect } from "react";
import { SessionProvider, useSession, signIn } from "next-auth/react";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Checks session refresh errors and redirects to signIn("microsoft-entra-id") on failure.
 */
function RefreshErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if (
      session &&
      "error" in session &&
      session.error === "RefreshAccessTokenError"
    ) {
      signIn("microsoft-entra-id");
    }
  }, [session]);

  return null;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Constellation Brands</title>
      </head>
      <body>
        <SessionProvider>
          <AuthProvider>
            <RefreshErrorHandler />
            <Navbar />
            {children}
            <Toaster 
              position="top-right"
              richColors
              closeButton
              expand={false}
              visibleToasts={5}
            />
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}