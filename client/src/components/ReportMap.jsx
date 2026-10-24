import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { latLngBounds } from "leaflet";

const defaultCenter = [9.03, 38.74];
const statusColors = {
  reported: "#d39b23",
  under_review: "#9274b8",
  in_progress: "#4384b7",
  pending_verification: "#ba8452",
  resolved: "#4a9562",
  rejected: "#849087",
};
const statusLabels = {
  reported: "Reported",
  under_review: "Under review",
  in_progress: "In progress",
  pending_verification: "Pending verification",
  resolved: "Resolved",
  rejected: "Closed",
};

function MapContent({ reports, onPick, selectedLocation }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLocation) {
      map.setView(
        [selectedLocation.latitude, selectedLocation.longitude],
        Math.max(map.getZoom(), 15),
      );
      return;
    }
    const points = reports.filter(
      (report) => report.latitude != null && report.longitude != null,
    );
    if (points.length > 1) {
      map.fitBounds(
        latLngBounds(
          points.map((report) => [
            Number(report.latitude),
            Number(report.longitude),
          ]),
        ),
        { padding: [32, 32], maxZoom: 14 },
      );
    } else if (points.length === 1) {
      map.setView(
        [Number(points[0].latitude), Number(points[0].longitude)],
        14,
      );
    }
  }, [map, reports, selectedLocation]);

  useMapEvents({
    click(event) {
      if (onPick)
        onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  return (
    <>
      {reports
        .filter((report) => report.latitude != null && report.longitude != null)
        .map((report) => {
          const fill = statusColors[report.status] || statusColors.reported;
          const urgent = report.priority === "urgent";
          return (
            <CircleMarker
              key={report.id}
              center={[Number(report.latitude), Number(report.longitude)]}
              radius={urgent ? 9 : 7}
              pathOptions={{
                color: urgent ? "#bf4d3c" : "#fff",
                weight: urgent ? 3 : 2,
                fillColor: fill,
                fillOpacity: 0.92,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <span className="map-popup-category">
                    {report.category_name ||
                      report.category?.replaceAll("_", " ")}
                  </span>
                  <Link
                    to={`/reports/${report.id}`}
                    className="map-popup-title"
                  >
                    {report.title}
                  </Link>
                  <span className="map-popup-meta">
                    {report.neighborhood} ·{" "}
                    {statusLabels[report.status] ||
                      report.status.replaceAll("_", " ")}{" "}
                    · {report.priority} priority
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      {selectedLocation && (
        <CircleMarker
          center={[selectedLocation.latitude, selectedLocation.longitude]}
          radius={9}
          pathOptions={{
            color: "#fff",
            weight: 3,
            fillColor: "#397753",
            fillOpacity: 1,
          }}
        />
      )}
    </>
  );
}

export default function ReportMap({
  reports = [],
  onPick,
  selectedLocation,
  className = "",
}) {
  const points = reports.filter(
    (report) => report.latitude != null && report.longitude != null,
  );
  const center = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : points.length
      ? [Number(points[0].latitude), Number(points[0].longitude)]
      : defaultCenter;
  return (
    <MapContainer
      className={`fixnearme-map ${onPick ? "pick-location" : ""} ${className}`}
      center={center}
      zoom={12}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapContent
        reports={reports}
        onPick={onPick}
        selectedLocation={selectedLocation}
      />
    </MapContainer>
  );
}

export { statusColors, statusLabels };
