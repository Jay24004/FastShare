import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export async function GET() {
  const records = await client.GetUsageInfo();
  return NextResponse.json(records, { status: 200 });
}
