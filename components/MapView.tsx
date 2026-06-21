"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Pin } from "@/lib/types";
import { loadPins, pinInRange } from "@/lib/data";
import { ARCHIVE_HOME } from "@/lib/images";
import TimeSlider from "./TimeSlider";
import PlacePanel from "./PlacePanel";

// Free, no-API-key vector basemap. Muted so the photo pins stand out; the style
// ships its own glyphs (Open Sans) and attribution. Swappable for self-hosted
// pmtiles later without touching the rest of the app.
const BASEMAP =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const AMS_CENTER: [number, number] = [4.9041, 52.3676];
const LABEL_FONT = ["Open Sans Bold"];

type PointFC = GeoJSON.FeatureCollection<GeoJSON.Point>;

function buildFC(pins: Pin[], from: number, to: number): PointFC {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const p of pins) {
    if (!pinInRange(p, from, to)) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, address: p.address, count: p.count },
    });
  }
  return { type: "FeatureCollection", features };
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoverPopup = useRef<maplibregl.Popup | null>(null);
  const rafRef = useRef<number | null>(null);

  const [pins, setPins] = useState<Pin[]>([]);
  const [bounds, setBounds] = useState<{ min: number; max: number } | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Load the pin index once ------------------------------------------
  useEffect(() => {
    loadPins()
      .then(({ pins, minYear, maxYear }) => {
        setPins(pins);
        setBounds({ min: minYear, max: maxYear });
        setRange([minYear, maxYear]);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // --- Init the map once -------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP,
      center: AMS_CENTER,
      zoom: 12.4,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    hoverPopup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "hover-popup",
    });

    map.on("load", () => {
      map.addSource("places", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 52,
        clusterMaxZoom: 15,
        clusterProperties: {
          // Sum of photos across a cluster, for the tooltip.
          photos: ["+", ["get", "count"]],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#c79a5e",
            25,
            "#b5803f",
            100,
            "#8a5a24",
          ],
          "circle-radius": ["step", ["get", "point_count"], 15, 25, 20, 100, 27],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f7f3ea",
          "circle-opacity": 0.92,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "places",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": LABEL_FONT,
          "text-size": 12,
        },
        paint: { "text-color": "#fff7ec" },
      });

      map.addLayer({
        id: "place",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#9a6a34",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "count"],
            1,
            5,
            50,
            10,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f7f3ea",
          "circle-opacity": 0.95,
        },
      });

      // Interactions ---------------------------------------------------
      map.on("click", "clusters", async (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = f.properties?.cluster_id;
        const src = map.getSource("places") as maplibregl.GeoJSONSource;
        try {
          const zoom = await src.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        } catch {
          /* ignore */
        }
      });

      map.on("click", "place", (e) => {
        const f = e.features?.[0];
        const id = f?.properties?.id;
        if (typeof id === "number") setSelectedId(id);
      });

      const setPointer = (v: boolean) => {
        map.getCanvas().style.cursor = v ? "pointer" : "";
      };
      for (const layer of ["clusters", "place"]) {
        map.on("mouseenter", layer, () => setPointer(true));
        map.on("mouseleave", layer, () => setPointer(false));
      }

      map.on("mouseenter", "place", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const { address, count } = f.properties as { address: string; count: number };
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        hoverPopup.current
          ?.setLngLat(coords)
          .setHTML(
            `<strong>${escapeHtml(address)}</strong><span>${count} photo${count === 1 ? "" : "s"}</span>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", "place", () => hoverPopup.current?.remove());

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- Push filtered data to the map when pins/range/ready change --------
  useEffect(() => {
    if (!ready || !range || pins.length === 0) return;
    const map = mapRef.current;
    if (!map) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const src = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
      src?.setData(buildFC(pins, range[0], range[1]));
    });
  }, [pins, range, ready]);

  const visibleCount = useMemo(() => {
    if (!range) return 0;
    let n = 0;
    for (const p of pins) if (pinInRange(p, range[0], range[1])) n++;
    return n;
  }, [pins, range]);

  const handleRange = useCallback((from: number, to: number) => {
    setRange([from, to]);
  }, []);

  return (
    <>
      <div id="map" ref={containerRef} />

      <header className="brand">
        <h1>
          oldams<span className="dot">.</span>
        </h1>
        <p>
          Historical photographs of Amsterdam, pinned where they were taken.
          Drag the years to travel through time.
        </p>
      </header>

      <div className="credit">
        Photographs ©{" "}
        <a href={ARCHIVE_HOME} target="_blank" rel="noopener noreferrer">
          Stadsarchief Amsterdam
        </a>{" "}
        &amp; the credited rights holders. This site only links to them.
      </div>

      {bounds && range && (
        <TimeSlider
          min={bounds.min}
          max={bounds.max}
          from={range[0]}
          to={range[1]}
          visibleCount={visibleCount}
          onChange={handleRange}
        />
      )}

      {selectedId != null && range && (
        <PlacePanel
          placeId={selectedId}
          from={range[0]}
          to={range[1]}
          onClose={() => setSelectedId(null)}
        />
      )}

      {error && (
        <div className="status" role="alert">
          <span>couldn’t load the archive — {error}</span>
        </div>
      )}
    </>
  );
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
