import { NextResponse } from "next/server";
import {
  starterLocations,
  starterRoles,
  starterSkus,
  starterUsers,
  validateStarterData
} from "@/lib/starter-data";

export function GET() {
  const counts = validateStarterData();
  const safeUsers = starterUsers.map(({ password, ...user }) => user);

  return NextResponse.json({
    counts,
    roles: starterRoles,
    locations: starterLocations,
    users: safeUsers,
    skus: starterSkus
  });
}
