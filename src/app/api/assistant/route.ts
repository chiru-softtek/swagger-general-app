import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const accessToken = request.headers.get("authorization")?.split("Bearer ")[1];
  if (!accessToken) {
    return NextResponse.json({ error: "No access token provided" }, { status: 401 });
  }

  // Extract assistant name from URL parameters
  const url = new URL(request.url);
  const assistantName = url.searchParams.get("name");

  if (!assistantName) {
    return NextResponse.json({ error: "Assistant name is required" }, { status: 400 });
  }

  try {
    const externalUrl = `${process.env.MODEL_BASE_URL}/assistant/${assistantName}`;

    const response = await fetch(externalUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch assistant: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

