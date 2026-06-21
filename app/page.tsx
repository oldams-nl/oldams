"use client";

import dynamic from "next/dynamic";

// MapLibre touches window/document, so the map only loads in the browser.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="status">
      <span className="pulse">loading the city…</span>
    </div>
  ),
});

export default function Page() {
  return <MapView />;
}
