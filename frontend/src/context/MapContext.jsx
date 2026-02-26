import { createContext, useContext, useState, useCallback } from 'react';

const MapContext = createContext(null);

export const useMapContext = () => {
    const ctx = useContext(MapContext);
    if (!ctx) throw new Error('useMapContext must be used within MapProvider');
    return ctx;
};

export const MapProvider = ({ children }) => {
    const [markers, setMarkers] = useState([]);
    const [polylines, setPolylines] = useState([]);
    const [flyTo, setFlyTo] = useState(null);
    const [selectedMarkerId, setSelectedMarkerId] = useState(null);
    const [onMarkerClick, setOnMarkerClick] = useState(null);

    // Convenience: set all map data at once
    const setMapData = useCallback(({ markers, polylines, flyTo, selectedMarkerId, onMarkerClick } = {}) => {
        if (markers !== undefined) setMarkers(markers);
        if (polylines !== undefined) setPolylines(polylines);
        if (flyTo !== undefined) setFlyTo(flyTo);
        if (selectedMarkerId !== undefined) setSelectedMarkerId(selectedMarkerId);
        if (onMarkerClick !== undefined) setOnMarkerClick(() => onMarkerClick);
    }, []);

    return (
        <MapContext.Provider value={{
            markers, setMarkers,
            polylines, setPolylines,
            flyTo, setFlyTo,
            selectedMarkerId, setSelectedMarkerId,
            onMarkerClick, setOnMarkerClick: (fn) => setOnMarkerClick(() => fn),
            setMapData,
        }}>
            {children}
        </MapContext.Provider>
    );
};

export default MapContext;
