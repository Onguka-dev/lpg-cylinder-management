import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
      stage: "5",
    app: "lpg-cylinder-management"
  });
}
