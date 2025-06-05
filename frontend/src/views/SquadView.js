import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import BoostTabRedesign from '../components/squads/BoostTabRedesign';
import { canAssignPlayerToRole } from '../utils/boostEligibility';
import { getRoleIcon } from '../utils/roleUtils';

const SquadView = () => {
    const { leagueId, squadId } = useParams();
    const [squadData, setSquadData] = React.useState(null);
    const [boostRoles, setBoostRoles] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('overview');
    const [isOwnSquad, setIsOwnSquad] = React.useState(false);

    const fetchSquadData = useCallback(async () => {
        try {
            const response = await api.get(`/leagues/${leagueId}/squads/${squadId}`);
            setSquadData(response.data);
        } catch (error) {
            console.error("Failed to fetch squad data:", error);
        }
    }, [leagueId, squadId]);

    const handleUpdateBoost = useCallback(async (boostRoleId, playerId) => {
        try {
            await api.post(`/leagues/${leagueId}/squads/${squadId}/boosts/`, {
                boost_role_id: boostRoleId,
                player_id: playerId
            });
            fetchSquadData();
        } catch (error) {
            console.error("Failed to update boost:", error);
            throw error;
        }
    }, [leagueId, squadId, fetchSquadData]);

    React.useEffect(() => {
        fetchSquadData();
    }, [fetchSquadData]);

    return (
        <div>
            {/* Render tabs */}
            {activeTab === 'boosts' && (
                <BoostTabRedesign
                    players={squadData?.players || []}
                    boostRoles={boostRoles || []}
                    currentCoreSquad={squadData?.current_core_squad || []}
                    futureCoreSquad={squadData?.future_core_squad || []}
                    onUpdateRole={handleUpdateBoost}
                    isOwnSquad={isOwnSquad}
                    leagueId={leagueId}
                    squadColor={squadData?.color || '#ffffff'}
                />
            )}
        </div>
    );
};

export default SquadView;