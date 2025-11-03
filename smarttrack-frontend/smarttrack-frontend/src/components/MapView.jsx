import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Select from "react-select";

// 🏢 Custom marker icon
const officeIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -25],
});

// 🌍 Map controller for smooth transitions
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapView = ({ offices }) => {
  const [selectedOffice, setSelectedOffice] = useState(null);

  if (!offices || offices.length === 0) {
    return <p className="text-center mt-4">No offices found</p>;
  }

  const defaultCenter = [offices[0].latitude || 0, offices[0].longitude || 0];

  useEffect(() => {
    if (offices.length > 0 && !selectedOffice) {
      setSelectedOffice(offices[0]);
    }
  }, [offices]);

  // Dropdown options
  const officeOptions = offices.map((o) => ({
    value: o.id,
    label: o.name,
  }));

  const currentOption = selectedOffice
    ? { value: selectedOffice.id, label: selectedOffice.name }
    : null;

  // Determine zoom level (16 ≈ 150% zoom, 6 = overview)
  const zoomLevel = selectedOffice ? 17 : 6;

  return (
    <div>
      {/* 🔍 Searchable Dropdown */}
      <div
        className="mb-3 text-center"
        style={{ position: "relative", zIndex: 2000 }}
      >
        <label className="fw-semibold me-2">Select Office:</label>
        <div
          style={{
            display: "inline-block",
            width: "280px",
            verticalAlign: "middle",
          }}
        >
          <Select
            options={officeOptions}
            value={currentOption}
            onChange={(option) => {
              const office = offices.find((o) => o.id === option.value);
              setSelectedOffice(office);
            }}
            placeholder="Search or select office..."
            isSearchable
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "8px",
                borderColor: "#007bff",
                boxShadow: "none",
                "&:hover": { borderColor: "#0056b3" },
              }),
              menu: (base) => ({
                ...base,
                zIndex: 3000,
              }),
            }}
          />
        </div>
      </div>

      {/* 🗺️ Map */}
      <div
        style={{
          height: "70vh",
          borderRadius: "10px",
          overflow: "hidden",
          position: "relative",
          zIndex: 0,
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={zoomLevel}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Fly to selected office with zoom */}
          {selectedOffice && (
            <MapController
              center={[selectedOffice.latitude, selectedOffice.longitude]}
              zoom={zoomLevel}
            />
          )}

          {/* Render markers + circles */}
          {offices.map((office) => (
            <React.Fragment key={office.id}>
              <Marker
                position={[office.latitude, office.longitude]}
                icon={officeIcon}
              >
                <Popup>
                  <b>{office.name}</b>
                  <br />
                  Lat: {office.latitude}
                  <br />
                  Lng: {office.longitude}
                  <br />
                  Radius: {office.radius} m
                </Popup>
              </Marker>

              <Circle
                center={[office.latitude, office.longitude]}
                radius={office.radius}
                pathOptions={{
                  color:
                    selectedOffice && selectedOffice.id === office.id
                      ? "green"
                      : "blue",
                  fillColor:
                    selectedOffice && selectedOffice.id === office.id
                      ? "lightgreen"
                      : "lightblue",
                  fillOpacity: 0.3,
                }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
