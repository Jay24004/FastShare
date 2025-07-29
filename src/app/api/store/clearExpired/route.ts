import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export async function GET() {
  await client.deleteExpiredFiles();
  return NextResponse.json({ message: "Expired files deleted successfully" }, { status: 200 });
}
