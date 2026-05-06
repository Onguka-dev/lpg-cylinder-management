import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
      stage: "7",
    app: "lpg-cylinder-management"
  });
}
