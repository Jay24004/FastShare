import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { Files, ExpirationDays } = await request.json();
    if (!Files || !ExpirationDays) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const fileEntry = await client.createFileEntry(Files, ExpirationDays);
    return NextResponse.json(fileEntry, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const shareCode = request.nextUrl.searchParams.get("code");
    if (!shareCode) {
      return NextResponse.json({ error: "Share code is required" }, { status: 400 });
    }
    const fileEntry = await client.getFileEntry(shareCode);
    if (!fileEntry) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (fileEntry.ExpiresAt && new Date(fileEntry.ExpiresAt).toISOString() < new Date().toISOString()) {
      return NextResponse.json({ error: "File has expired" }, { status: 410 });
    }

    return NextResponse.json(fileEntry, { status: 200 });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
