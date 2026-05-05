import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    stage: "4",
    app: "lpg-cylinder-management"
  });
}
