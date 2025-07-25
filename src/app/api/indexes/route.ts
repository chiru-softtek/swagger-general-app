import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const accessToken = request.headers.get("authorization")?.split("Bearer ")[1];
  if (!accessToken) {
    return NextResponse.json({ error: "No access token provided" }, { status: 401 });
  }

  try {
    const externalUrl = `${process.env.MODEL_BASE_URL}/indexes`;

    const response = await fetch(externalUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch indexes");
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
