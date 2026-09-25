"use client";

import dynamic from "next/dynamic";

// `next/dynamic(..., { ssr: false })` isn't allowed directly inside a
// Server Component in this Next.js version -- wrap it in this thin Client
// Component so app/reference/map/page.tsx can stay a Server Component.
const LeafletZoneMap = dynamic(() => import("./LeafletZoneMap"), { ssr: false });

export default LeafletZoneMap;
