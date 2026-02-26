import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';
import { useMapContext } from '../../context/MapContext';
import { FiLayers, FiEye, FiEyeOff } from 'react-icons/fi';

// ====== POI DATA ======
const depotsData = [
    { id: 'd1', nom: 'Dépôt Central Tunis', lat: 36.7992, lng: 10.1658 },
    { id: 'd2', nom: 'Dépôt Sousse', lat: 35.8333, lng: 10.6000 },
    { id: 'd3', nom: 'Dépôt Sfax', lat: 34.7500, lng: 10.7500 },
];

const stationsData = [
    { id: 's1', nom: 'Station Shell Tunis', lat: 36.8100, lng: 10.1700 },
    { id: 's2', nom: 'Station Total Ariana', lat: 36.8600, lng: 10.1800 },
    { id: 's3', nom: 'Station Agil Sousse', lat: 35.8200, lng: 10.6300 },
    { id: 's4', nom: 'Station Shell Sfax', lat: 34.7450, lng: 10.7650 },
];

const clientsInternesData = [
    { id: 'ci1', nom: 'Usine A – Tunis', lat: 36.7900, lng: 10.1500 },
    { id: 'ci2', nom: 'Entrepôt B – Manouba', lat: 36.8050, lng: 10.0900 },
];

const clientsExternesData = [
    { id: 'ce1', nom: 'Client Externe 1 – Nabeul', lat: 36.4600, lng: 10.7300 },
    { id: 'ce2', nom: 'Client Externe 2 – Bizerte', lat: 37.2800, lng: 9.8700 },
];

const arretsData = [
    { id: 'a1', nom: 'Arrêt Parking – Zaghouan', lat: 36.4050, lng: 10.1450, type: 'conforme' },
    { id: 'a2', nom: 'Arrêt – Kairouan', lat: 35.6800, lng: 10.1000, type: 'non_conforme' },
    { id: 'a3', nom: 'Arrêt – Hammamet', lat: 36.3950, lng: 10.6100, type: 'conforme' },
];

// ====== ICON HELPERS ======
const createPOIIcon = (color, emoji) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width:28px;height:28px;background:${color};border:2px solid white;border-radius:6px;
            display:flex;align-items:center;justify-content:center;font-size:14px;
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
        ">${emoji}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18],
    });
};

const depotIcon = createPOIIcon('#3b82f6', '📦');
const stationIcon = createPOIIcon('#6366f1', '⛽');
const clientInterneIcon = createPOIIcon('#f97316', '🏭');
const clientExterneIcon = createPOIIcon('#ef4444', '🏢');
const arretConformeIcon = createPOIIcon('#22c55e', '🅿');
const arretNCIcon = createPOIIcon('#ef4444', '🅿');

// ====== FLY-TO HELPER ======
const FlyToPosition = ({ position, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, zoom || 12, { duration: 1.2 });
        }
    }, [position, zoom, map]);
    return null;
};

// ====== LAYER CONFIG ======
const layerConfig = [
    { key: 'trajet', label: 'Trajet', color: '#3b82f6' },
    { key: 'clients', label: 'Clients', color: '#f97316' },
    { key: 'stations', label: 'Stations', color: '#6366f1' },
    { key: 'depots', label: 'Dépôts', color: '#3b82f6' },
    { key: 'arrets', label: 'Arrêts', color: '#22c55e' },
];

// ====== MAIN COMPONENT ======
const MapView = () => {
    const { markers, polylines, flyTo, onMarkerClick } = useMapContext();

    const [layers, setLayers] = useState({
        trajet: true, clients: true, stations: true, depots: true, arrets: true,
    });
    const [showLayerPanel, setShowLayerPanel] = useState(false);

    const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="h-full w-full relative">
            <MapContainer
                center={[35.8, 10.2]}
                zoom={7}
                className="h-full w-full"
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {flyTo && <FlyToPosition position={flyTo} zoom={12} />}

                {/* Polylines from context */}
                {layers.trajet && polylines.map((pl, i) => (
                    <Polyline
                        key={`pl-${i}`}
                        positions={pl.positions}
                        pathOptions={{
                            color: pl.color || '#3b82f6',
                            weight: pl.weight || 4,
                            opacity: pl.opacity || 0.8,
                        }}
                    />
                ))}

                {/* Markers from context */}
                {markers.map((m) => (
                    <Marker
                        key={m.id}
                        position={[m.lat, m.lng]}
                        icon={m.icon}
                        eventHandlers={{
                            click: () => onMarkerClick && onMarkerClick(m),
                        }}
                    >
                        <Popup>
                            <div className="text-sm min-w-[180px]">
                                <p className="font-bold text-gray-800">{m.label}</p>
                                {m.sublabel && <p className="text-orange-500">{m.sublabel}</p>}
                                {m.info && <p className="text-gray-500 mt-1">{m.info}</p>}
                                {m.badgeLabel && (
                                    <span
                                        className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                                        style={{ background: m.badgeColor || '#888' }}
                                    >
                                        {m.badgeLabel}
                                    </span>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* POI Layers — Dépôts */}
                {layers.depots && depotsData.map(d => (
                    <Marker key={d.id} position={[d.lat, d.lng]} icon={depotIcon}>
                        <Popup><div className="text-sm font-semibold">{d.nom}</div></Popup>
                    </Marker>
                ))}

                {/* POI Layers — Stations */}
                {layers.stations && stationsData.map(s => (
                    <Marker key={s.id} position={[s.lat, s.lng]} icon={stationIcon}>
                        <Popup><div className="text-sm font-semibold">{s.nom}</div></Popup>
                    </Marker>
                ))}

                {/* POI Layers — Clients */}
                {layers.clients && clientsInternesData.map(c => (
                    <Marker key={c.id} position={[c.lat, c.lng]} icon={clientInterneIcon}>
                        <Popup>
                            <div className="text-sm">
                                <span className="font-semibold">{c.nom}</span><br />
                                <span className="text-orange-500 text-xs">Client Interne</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
                {layers.clients && clientsExternesData.map(c => (
                    <Marker key={c.id} position={[c.lat, c.lng]} icon={clientExterneIcon}>
                        <Popup>
                            <div className="text-sm">
                                <span className="font-semibold">{c.nom}</span><br />
                                <span className="text-red-500 text-xs">Client Externe</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* POI Layers — Arrêts */}
                {layers.arrets && arretsData.map(a => (
                    <Marker key={a.id} position={[a.lat, a.lng]} icon={a.type === 'conforme' ? arretConformeIcon : arretNCIcon}>
                        <Popup>
                            <div className="text-sm">
                                <span className="font-semibold">{a.nom}</span><br />
                                <span className={`text-xs font-medium ${a.type === 'conforme' ? 'text-green-600' : 'text-red-600'}`}>
                                    {a.type === 'conforme' ? 'Arrêt conforme' : 'Arrêt non conforme'}
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* ====== LAYER TOGGLE ====== */}
            <div className="absolute top-4 right-4 z-[1000]">
                <button
                    onClick={() => setShowLayerPanel(!showLayerPanel)}
                    className="bg-white rounded-lg shadow-lg p-2.5 hover:bg-gray-50 transition-colors border border-gray-200"
                    title="Couches de carte"
                >
                    <FiLayers className="text-lg text-gray-700" />
                </button>

                {showLayerPanel && (
                    <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-[200px]">
                        <h4 className="font-bold text-gray-800 text-sm mb-3">Couches</h4>
                        <div className="space-y-2">
                            {layerConfig.map(layer => (
                                <label
                                    key={layer.key}
                                    className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={layers[layer.key]}
                                        onChange={() => toggleLayer(layer.key)}
                                        className="w-4 h-4 rounded accent-orange-500"
                                    />
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ background: layer.color }}
                                    ></span>
                                    <span className="text-sm text-gray-700">{layer.label}</span>
                                    {layers[layer.key] ? (
                                        <FiEye className="ml-auto text-gray-400 text-sm" />
                                    ) : (
                                        <FiEyeOff className="ml-auto text-gray-300 text-sm" />
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ====== LÉGENDE ====== */}
            <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg p-4 z-[1000] text-sm">
                <h4 className="font-bold text-gray-800 mb-3">Légende</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-200"></span>
                        <span className="text-gray-600">En route</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-200"></span>
                        <span className="text-gray-600">Arrêté</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-200"></span>
                        <span className="text-gray-600">Arrêté NC</span>
                    </div>
                    <hr className="my-1" />
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-0.5 bg-blue-500"></span>
                        <span className="text-gray-600">Trajet</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-blue-500"></span>
                        <span className="text-gray-600">Dépôt</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                        <span className="text-gray-600">Client Interne</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-400"></span>
                        <span className="text-gray-600">Client Externe</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-400 border-2 border-indigo-200"></span>
                        <span className="text-gray-600">Station</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapView;
