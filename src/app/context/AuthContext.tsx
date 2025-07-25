"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface SessionWithAccessToken {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  expires: string;
}

interface AuthContextType {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value = {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    accessToken: (session as SessionWithAccessToken)?.accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}