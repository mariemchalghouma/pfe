import api from './api';

export const carburantService = {
  // Récupérer tous les écarts
  getEcarts: async () => {
    return await api.get('/api/carburant');
  },

  // Récupérer les écarts d'un camion spécifique
  getEcartsByCamion: async (camion) => {
    return await api.get(`/api/carburant/${encodeURIComponent(camion)}`);
  },
};
