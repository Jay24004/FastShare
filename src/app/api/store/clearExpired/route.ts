import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export async function GET() {
  const records = await client.deleteExpiredFiles();
  return NextResponse.json({ system: `Deleted ${records} expired file entries.` }, { status: 200 });
}
