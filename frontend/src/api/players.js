import { api } from './base';

export const fetchPlayerData = async (playerId, leagueId) => {
  const response = await api.get(`/api/leagues/${leagueId}/players/${playerId}/`);
  return response.data;
};