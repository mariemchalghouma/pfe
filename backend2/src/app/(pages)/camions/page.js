'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { FaGasPump, FaTachometerAlt, FaThermometerHalf, FaRoad } from 'react-icons/fa';
import { camionsAPI } from '@/services/api';
import { useMapContext } from '@/context/MapContext';
import { reverseGeocode } from '@/services/geocoding';

const createIcon = (color, letter) => {
    if (typeof window === 'undefined') return null;
    const L = require('leaflet');
    return L.divIcon({
        className: 'custom-marker',
        html: `
      <div style="
        width: 32px; height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: bold; font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${letter}</div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    });
};

const statusConfig = {
    en_route: { label: 'En route', color: '#22c55e', badgeBg: '#dcfce7', badgeText: '#16a34a' },
    arrete: { label: 'Arrêté', color: '#f97316', badgeBg: '#fff7ed', badgeText: '#ea580c' },
    arrete_nc: { label: 'Arrêté NC', color: '#ef4444', badgeBg: '#fef2f2', badgeText: '#dc2626' },
    unknown: { label: 'Inconnu', color: '#94a3b8', badgeBg: '#f1f5f9', badgeText: '#475569' },
};

const getStatusIcon = (status) => {
    if (typeof window === 'undefined') return null;
    const cfg = statusConfig[status] || statusConfig.unknown;
    return createIcon(cfg.color, 'C');
};

const Camions = () => {
    const { setMapData, setPolylines, setFlyTo } = useMapContext();
    const [camions, setCamions] = useState([]);
    const [addresses, setAddresses] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedCamionPlaque, setSelectedCamionPlaque] = useState(null);
    const [trajet, setTrajet] = useState([]);

    const loadCamions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await camionsAPI.getCamions();
            const camionsData = response.data || [];
            setCamions(camionsData);

            const addressPromises = camionsData
                .filter((c) => c.lat != null && c.lng != null)
                .map(async (camion) => {
                    const address = await reverseGeocode(camion.lat, camion.lng);
                    return { plaque: camion.plaque, address };
                });

            const addressResults = await Promise.all(addressPromises);
            const newAddresses = new Map(addressResults.map(({ plaque, address }) => [plaque, address]));
            setAddresses(newAddresses);

            const markers = camionsData
                .filter((c) => c.lat != null && c.lng != null)
                .map((camion) => {
                    const config = statusConfig[camion.statut] || statusConfig.unknown;
                    return {
                        id: camion.plaque,
                        lat: camion.lat,
                        lng: camion.lng,
                        icon: getStatusIcon(camion.statut),
                        label: camion.plaque,
                        sublabel: camion.chauffeur || '—',
                        info: `📍 ${newAddresses.get(camion.plaque) || camion.localisation || '—'} · ${camion.vitesse ?? 0} km/h`,
                        badgeLabel: config.label,
                        badgeColor: config.color,
                    };
                });

            setMapData({ markers, polylines: [], flyTo: null, selectedMarkerId: null });
        } catch (err) {
            setError(err.message || 'Impossible de charger les camions');
            setCamions([]);
        } finally {
            setLoading(false);
        }
    }, [setMapData]);

    useEffect(() => {
        loadCamions();
    }, [loadCamions]);

    const loadTrajet = useCallback(async (plaque) => {
        if (!plaque) {
            setTrajet([]);
            setPolylines([]);
            return;
        }
        try {
            const response = await camionsAPI.getCamionTrajet(plaque);
            const trajetData = response.data || [];
            setTrajet(trajetData);

            if (trajetData.length > 0) {
                setPolylines([{
                    positions: trajetData,
                    color: '#3b82f6',
                    weight: 4,
                    opacity: 0.8,
                }]);
            } else {
                setPolylines([]);
            }
        } catch {
            setTrajet([]);
            setPolylines([]);
        }
    }, [setPolylines]);

    const filteredCamions = camions.filter(
        (c) =>
            String(c.plaque || '').toLowerCase().includes(search.toLowerCase()) ||
            String(c.chauffeur || '').toLowerCase().includes(search.toLowerCase()) ||
            String(c.localisation || '').toLowerCase().includes(search.toLowerCase())
    );

    const selectedCamion = camions.find((c) => c.plaque === selectedCamionPlaque);

    const handleSelectCamion = async (camion) => {
        setSelectedCamionPlaque(camion.plaque);

        if (camion.lat != null && camion.lng != null) {
            if (!addresses.has(camion.plaque)) {
                const address = await reverseGeocode(camion.lat, camion.lng);
                setAddresses((prev) => new Map(prev).set(camion.plaque, address));
            }
            setFlyTo([camion.lat, camion.lng]);
        } else {
            setFlyTo(null);
        }

        loadTrajet(camion.plaque);
    };

    const handleBackToList = () => {
        setSelectedCamionPlaque(null);
        setFlyTo(null);
        setTrajet([]);
        setPolylines([]);
    };

    return (
        <div className="flex h-full">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {loading && (
                    <div className="p-6 text-center text-gray-500">Chargement des camions…</div>
                )}
                {error && !loading && (
                    <div className="p-4 mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                        <button
                            type="button"
                            onClick={loadCamions}
                            className="block mt-2 text-orange-600 font-medium hover:underline"
                        >
                            Réessayer
                        </button>
                    </div>
                )}

                {!loading && selectedCamion ? (
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-4 pt-4 pb-2">
                            <button
                                onClick={handleBackToList}
                                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors cursor-pointer"
                            >
                                <FiArrowLeft className="text-base" />
                                Retour à la liste
                            </button>
                        </div>

                        <div className="px-5 pb-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800">{selectedCamion.plaque}</h2>
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-bold"
                                    style={{
                                        background: (statusConfig[selectedCamion.statut] || statusConfig.unknown).badgeBg,
                                        color: (statusConfig[selectedCamion.statut] || statusConfig.unknown).badgeText,
                                        border: `1.5px solid ${(statusConfig[selectedCamion.statut] || statusConfig.unknown).color}`
                                    }}
                                >
                                    {(statusConfig[selectedCamion.statut] || statusConfig.unknown).label}
                                </span>
                            </div>
                        </div>

                        <div className="mx-5 mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 text-gray-500 font-medium">Chauffeur</td>
                                        <td className="py-2 text-right text-gray-800 font-semibold">{selectedCamion.chauffeur}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 text-gray-500 font-medium">Téléphone</td>
                                        <td className="py-2 text-right text-gray-800 font-semibold">{selectedCamion.telephone}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 text-gray-500 font-medium">Position</td>
                                        <td className="py-2 text-right text-gray-800 font-semibold">
                                            {selectedCamion.lat != null && selectedCamion.lng != null
                                                ? (addresses.get(selectedCamion.plaque) || selectedCamion.localisation || `${selectedCamion.lat.toFixed(4)}, ${selectedCamion.lng.toFixed(4)}`)
                                                : (selectedCamion.localisation || '—')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-gray-500 font-medium">Dernière MAJ</td>
                                        <td className="py-2 text-right text-gray-800 font-semibold">{selectedCamion.derniereMaj}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                <FaTachometerAlt className="mx-auto text-2xl text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500 mb-1">Vitesse</p>
                                <p className="text-xl font-bold text-gray-800">{selectedCamion.vitesse ?? '—'} <span className="text-sm font-normal text-gray-500">km/h</span></p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                <FaRoad className="mx-auto text-2xl text-orange-400 mb-2" />
                                <p className="text-xs text-orange-500 mb-1">Kilométrage</p>
                                <p className="text-xl font-bold text-orange-500">{(selectedCamion.kilometrage ?? 0).toLocaleString()} <span className="text-sm font-normal text-gray-500">km</span></p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                <FaGasPump className="mx-auto text-2xl text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500 mb-1">Carburant</p>
                                <p className="text-xl font-bold text-gray-800">{selectedCamion.carburant != null ? `${selectedCamion.carburant}%` : '—'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                <FaThermometerHalf className="mx-auto text-2xl text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500 mb-1">Temp. moteur</p>
                                <p className="text-xl font-bold text-gray-800">{selectedCamion.tempMoteur != null ? `${selectedCamion.tempMoteur}°C` : '—'}</p>
                            </div>
                        </div>

                        <div className="mx-5 mb-5 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Diagnostics</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Odomètre</span>
                                    <span className="font-semibold text-gray-800">{(selectedCamion.kilometrage ?? 0).toLocaleString()} km</span>
                                </div>
                                {selectedCamion.carburant != null && (
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-500">Niveau carburant</span>
                                            <span className="font-semibold text-gray-800">{selectedCamion.carburant}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="h-2.5 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(100, selectedCamion.carburant)}%`,
                                                    background: selectedCamion.carburant > 50 ? '#22c55e' :
                                                        selectedCamion.carburant > 20 ? '#f97316' : '#ef4444'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">GPS</span>
                                    <span className="font-semibold text-gray-800">
                                        {selectedCamion.lat != null && selectedCamion.lng != null
                                            ? `${selectedCamion.lat}, ${selectedCamion.lng}`
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-3">Camions</h2>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher (plaque, chauffeur, position)..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                            </div>
                            <p className="text-sm text-gray-400 mt-2">{filteredCamions.length} camion{filteredCamions.length !== 1 ? 's' : ''}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {!loading && filteredCamions.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">Aucun camion à afficher.</div>
                            )}
                            {filteredCamions.map((camion) => {
                                const config = statusConfig[camion.statut] || statusConfig.unknown;
                                return (
                                    <div
                                        key={camion.plaque}
                                        onClick={() => handleSelectCamion(camion)}
                                        className="px-4 py-3 border-b border-gray-50 cursor-pointer transition-all hover:bg-orange-50"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-800 text-sm">{camion.plaque}</span>
                                            <span
                                                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{
                                                    background: config.badgeBg,
                                                    color: config.badgeText,
                                                    border: `1px solid ${config.color}`
                                                }}
                                            >
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-orange-500">{camion.chauffeur}</span>
                                            <span className="text-sm text-gray-400">{camion.vitesse} km/h</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <FiMapPin className="text-gray-400 text-xs" />
                                            <span className="text-xs text-gray-400">
                                                {camion.lat != null && camion.lng != null
                                                    ? (addresses.get(camion.plaque) || camion.localisation || `${camion.lat.toFixed(4)}, ${camion.lng.toFixed(4)}`)
                                                    : (camion.localisation || '—')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Camions;
