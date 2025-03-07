// TradeList.js - updated to use player details from serializer
import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import TradeBanner from '../elements/TradeBanner';
import TradeForm from '../elements/TradeForm';

const TradeList = ({ league }) => {
  const [trades, setTrades] = useState([]);
  const [pendingTrades, setPendingTrades] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showTradeForm, setShowTradeForm] = useState(false);
  
  useEffect(() => {
    fetchTrades();
    fetchPendingTrades();
  }, []);
  
  const fetchTrades = async () => {
    try {
      // Fetch all trades in the league, not just those involving the current user
      const response = await api.get(`/trades/?league=${league.id}`);
      setTrades(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setLoading(false);
    }
  };
  
  const fetchPendingTrades = async () => {
    try {
      // Only fetch pending trades where the current user is the receiver
      const response = await api.get('/trades/pending/');
      setPendingTrades(response.data);
    } catch (error) {
      console.error('Error fetching pending trades:', error);
    }
  };
  
  const handleAcceptTrade = async (tradeId) => {
    try {
      const response = await api.patch(`/trades/${tradeId}/accept/`);
      
      // Show message about conflicts if any were resolved
      if (response.data.conflicts_resolved > 0) {
        // You could use a toast notification here or similar
        alert(`Trade accepted. ${response.data.conflicts_resolved} conflicting trade(s) were automatically cancelled.`);
      }
      
      // Refresh trades list
      fetchTrades();
      fetchPendingTrades();
    } catch (error) {
      console.error('Error accepting trade:', error);
    }
  };
  
  const handleRejectTrade = async (tradeId) => {
    try {
      await api.patch(`/trades/${tradeId}/reject/`);
      fetchTrades();
      fetchPendingTrades();
    } catch (error) {
      console.error('Error rejecting trade:', error);
    }
  };
  
  const filteredTrades = statusFilter === 'all' 
    ? trades 
    : trades.filter(trade => trade.status === statusFilter);

  const isTradeReceiver = (trade) => {
    return league?.my_squad?.id === trade.receiver;
  };
  
  const isTradeInitiator = (trade) => {
    return league?.my_squad?.id === trade.initiator;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Trade Market
          </h2>
          <button
            onClick={() => setShowTradeForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Propose Trade
          </button>
        </div>
      </div>
      
      {/* Pending Trades Banner */}
      {pendingTrades.length > 0 && (
        <TradeBanner 
          trades={pendingTrades} 
          onAccept={handleAcceptTrade} 
          onReject={handleRejectTrade}
        />
      )}
      
      {/* Trade Form Modal */}
      {showTradeForm && (
        <TradeForm 
          league={league} 
          onClose={() => setShowTradeForm(false)}
          onTradeCreated={() => {
            fetchTrades();
            setShowTradeForm(false);
          }}
        />
      )}
      
      {/* Filter Controls */}
      <div className="px-6 py-2 bg-gray-50 dark:bg-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              statusFilter === 'all' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1 text-sm rounded-md ${
              statusFilter === 'Pending' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('Accepted')}
            className={`px-3 py-1 text-sm rounded-md ${
              statusFilter === 'Accepted' 
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setStatusFilter('Rejected')}
            className={`px-3 py-1 text-sm rounded-md ${
              statusFilter === 'Rejected' 
                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('Closed')}
            className={`px-3 py-1 text-sm rounded-md ${
              statusFilter === 'Closed' 
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Closed
          </button>
        </div>
      </div>
      
      {/* Trades Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Initiator
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Receiver
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Players Given
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Players Received
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading trades...
                </td>
              </tr>
            ) : filteredTrades.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No trades found
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(trade.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {trade.initiator_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {trade.receiver_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {/* Display players given with names */}
                    {(trade.players_given_details || []).map(player => (
                      <div key={player.id}>
                        {player.name}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {/* Display players received with names */}
                    {(trade.players_received_details || []).map(player => (
                      <div key={player.id}>
                        {player.name}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      trade.status === 'Pending' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                        : trade.status === 'Accepted' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : trade.status === 'Rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {trade.status === 'Pending' && (
                      <div className="flex space-x-2 justify-end">
                        {/* Render accept/reject buttons ONLY if user is the receiver */}
                        {isTradeReceiver(trade) && (
                          <>
                            <button
                              onClick={() => handleAcceptTrade(trade.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectTrade(trade.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {/* Render cancel button ONLY if user is the initiator */}
                        {isTradeInitiator(trade) && (
                          <button
                            onClick={() => handleRejectTrade(trade.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeList;