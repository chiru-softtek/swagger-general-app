import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { Session } from "next-auth";

// Define custom types
interface CustomJWT extends JWT {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
}

interface CustomSession extends Session {
  accessToken?: string;
  error?: string;
}

// Function to refresh the access token
async function refreshAccessToken(token: CustomJWT): Promise<CustomJWT> {
  console.log("🔄 Attempting to refresh access token...", {
    hasRefreshToken: !!token.refreshToken,
    tokenExpires: token.accessTokenExpires ? new Date(token.accessTokenExpires) : null,
    currentTime: new Date(),
  });

  // If no refresh token, return error immediately
  if (!token.refreshToken) {
    console.error("❌ No refresh token available - user needs to re-authenticate");
    return {
      ...token,
      error: "RefreshAccessTokenError",
      accessToken: undefined,
      accessTokenExpires: undefined,
      refreshToken: undefined,
    };
  }

  try {
    const url = `${(process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER || "").replace('/v2.0', '')}/oauth2/v2.0/token`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken || "",
        client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID || "",
        scope: "openid profile email offline_access",
      }).toString(),
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("❌ Token refresh failed:", {
        status: response.status,
        statusText: response.statusText,
        error: refreshedTokens,
      });
      throw new Error(`Failed to refresh access token: ${response.status} ${response.statusText}`);
    }

    console.log("✅ Token refresh successful", {
      hasNewAccessToken: !!refreshedTokens.access_token,
      hasNewRefreshToken: !!refreshedTokens.refresh_token,
      expiresIn: refreshedTokens.expires_in,
    });

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + Number(refreshedTokens.expires_in) * 1000,
      refreshToken: refreshedTokens.refresh_token || token.refreshToken,
    };
  } catch (error) {
    console.error("💥 Error refreshing access token", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
      accessToken: undefined,
      accessTokenExpires: undefined,
      refreshToken: undefined,
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      // Include clientSecret conditionally based on environment
      ...(process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ? {
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        client: {
          token_endpoint_auth_method: "client_secret_post", // For confidential clients
        },
      } : {
        client: {
          token_endpoint_auth_method: "none", // For public clients
        },
      }),
      checks: ["pkce", "state"], // Keep PKCE for both client types for security
      authorization: {
        params: { 
          scope: "openid profile email offline_access api://bc5a8ec5-2a80-4764-b9b0-c8ee56a45c1a/Passthrough.Workloads.Gateway",
          access_type: "offline", // Ensure offline access
          prompt: "consent" // Force consent to ensure refresh token
        },
      },
    }),
  ],
  debug: process.env.AUTH_DEBUG === "true",
    callbacks: {
    async jwt({ token, account }) {
      let customToken = token as CustomJWT;
      
      // If user just signed in
      if (account?.access_token) {
        console.log("🆕 New login detected, storing tokens", {
          provider: account.provider,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresIn: account.expires_in,
        });
        
        customToken = {
          ...customToken,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + Number(account.expires_in) * 1000,
          refreshToken: account.refresh_token || "",
        };
      }

      // If token hasn't expired, return it as is
      if (customToken.accessTokenExpires && Date.now() < customToken.accessTokenExpires) {
        const minutesUntilExpiry = Math.round((customToken.accessTokenExpires - Date.now()) / (1000 * 60));
        console.log(`⏰ Token valid for ${minutesUntilExpiry} more minutes`);
        return customToken;
      }

      console.log("⚠️ Token expired, attempting refresh...", {
        expired: customToken.accessTokenExpires ? new Date(customToken.accessTokenExpires) : null,
        hasRefreshToken: !!customToken.refreshToken,
      });

      // If token has expired, try to refresh it
      return await refreshAccessToken(customToken);
    },
    async session({ session, token }) {
      const customToken = token as CustomJWT;
      const customSession = session as CustomSession;
      
      // Add access token to session
      customSession.accessToken = customToken.accessToken;
      customSession.error = customToken.error;
      
      if (customToken.error) {
        console.error("❌ Session has token error:", customToken.error);
      }
      
      return customSession;
    },
  },
  session: {
    strategy: "jwt",
  },
});
