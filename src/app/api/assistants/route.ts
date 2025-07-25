import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const accessToken = request.headers.get("authorization")?.split("Bearer ")[1];
  if (!accessToken) {
    return NextResponse.json({ error: "No access token provided" }, { status: 401 });
  }

  try {
    const externalUrl = `${process.env.MODEL_BASE_URL}/assistants/`;

    const response = await fetch(externalUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch assistants: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Extract bearer token
  const accessToken = request.headers.get("authorization")?.split("Bearer ")[1];

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token provided" },
      { status: 401 }
    );
  }

  // Read the incoming data
  const assistantData = await request.json();

  try {
    // Forward to the external API
    const response = await fetch(
      `${process.env.MODEL_BASE_URL}/assistant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(assistantData),
      }
    );

    // Get the response data
    const data = await response.json();

    // Return the response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
