import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { FiX } from 'react-icons/fi';
import { useEffect } from 'react';

const createIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
      <div style="
        width: 28px; height: 28px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
      </div>
    `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -10],
    });
};

const statusConfig = {
    conforme: { color: '#22c55e', label: 'Conforme', icon: createIcon('#22c55e') },
    non_conforme: { color: '#ef4444', label: 'Non Conforme', icon: createIcon('#ef4444') },
    en_route: { color: '#22c55e', label: 'En route', icon: createIcon('#22c55e') },
    arrete: { color: '#f97316', label: 'Arrêté', icon: createIcon('#f97316') },
    arrete_nc: { color: '#ef4444', label: 'Arrêté NC', icon: createIcon('#ef4444') },
};

const MapModal = ({ isOpen, onClose, positions = [], center, zoom = 13, title = 'Localisation sur la carte' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Default center if not provided
    const defaultCenter = positions.length > 0 ? [positions[0].lat, positions[0].lng] : [36.8065, 10.1815];
    const mapCenter = center || defaultCenter;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                        {positions.length > 0 && (
                            <p className="text-sm text-gray-500 mt-0.5">{positions.length} point(s) affiché(s)</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <FiX className="text-2xl" />
                    </button>
                </div>

                {/* Map Body */}
                <div className="flex-1 relative bg-gray-50">
                    <MapContainer
                        center={mapCenter}
                        zoom={zoom}
                        className="h-full w-full"
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {positions.map((pos, idx) => {
                            const markerIcon = pos.color
                                ? createIcon(pos.color)
                                : (statusConfig[pos.status]?.icon || createIcon('#3b82f6'));

                            return (
                                <Marker
                                    key={pos.id || idx}
                                    position={[pos.lat, pos.lng]}
                                    icon={markerIcon}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <p className="font-bold text-gray-800">{pos.label || 'Point'}</p>
                                            {pos.info && <p className="text-gray-500 mt-1">{pos.info}</p>}
                                            {pos.status && (
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase" style={{ background: statusConfig[pos.status]?.color || '#3b82f6' }}>
                                                    {statusConfig[pos.status]?.label || pos.status}
                                                </span>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Footer / Legend */}
                <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-6 bg-gray-50 text-sm overflow-x-auto">
                    <span className="font-semibold text-gray-700 whitespace-nowrap">Légende :</span>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></span>
                            <span className="text-gray-600">Conforme / En route</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></span>
                            <span className="text-gray-600">Non conforme / Alerte</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm"></span>
                            <span className="text-gray-600">Arrêté</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapModal;
