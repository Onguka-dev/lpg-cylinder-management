import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    stage: "18",
    app: "wells-gas-lpg-management"
  });
}
