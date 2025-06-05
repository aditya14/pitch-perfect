// TradeList.js - redesigned with clearer player movement visualization
import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import TradeBanner from '../elements/TradeBanner';
import TradeForm from '../elements/TradeForm';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

const TradeList = ({ league }) => {
  const [trades, setTrades] = useState([]);
  const [pendingTrades, setPendingTrades] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [showTradeForm, setShowTradeForm] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [tradesPerPage] = useState(6); // Show 6 trades per page (3 rows of 2)
  
  useEffect(() => {
    fetchTrades();
    fetchPendingTrades();
  }, []);
  
  const fetchTrades = async () => {
    try {
      // Fetch all trades in the league, not just those involving the current user
      const response = await api.get(`/trades/?league=${league.id}`);
      // Sort trades by created_at, most recent first
      const sortedTrades = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setTrades(sortedTrades);
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

  // Get current trades for pagination
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = filteredTrades.slice(indexOfFirstTrade, indexOfLastTrade);
  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Format date without seconds
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      // No seconds
    });
  };

  const isTradeReceiver = (trade) => {
    return league?.my_squad?.id === trade.receiver;
  };
  
  const isTradeInitiator = (trade) => {
    return league?.my_squad?.id === trade.initiator;
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300';
      case 'Accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300';
      case 'Closed':
        return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };
  
  return (
    <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="px-6 py-3 border-b border-neutral-00 dark:border-neutral-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Trades
          </h2>
          <button
            onClick={() => setShowTradeForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-neutral-600 hover:bg-neutral-700"
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
      <div className="px-6 py-2 bg-neutral-50 dark:bg-neutral-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              statusFilter === 'all' 
                ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              statusFilter === 'Pending' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('Accepted')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              statusFilter === 'Accepted' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setStatusFilter('Rejected')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              statusFilter === 'Rejected' 
                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('Closed')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              statusFilter === 'Closed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Closed
          </button>
        </div>
      </div>
      
      {/* Trades Card Grid with color-coded player movement */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-neutral-300 dark:border-neutral-600 rounded-full border-t-primary-600 dark:border-t-primary-400"></div>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">Loading trades...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">No trades found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentTrades.map((trade) => (
                <div key={trade.id} className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 rounded-lg shadow-sm overflow-hidden">
                  {/* Trade Header */}
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(trade.status)}`}>
                        {trade.status}
                      </span>
                      <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(trade.created_at)}
                      </span>
                    </div>
                    
                    {trade.status === 'Pending' && (
                      <div className="flex space-x-2">
                        {isTradeReceiver(trade) && (
                          <>
                            <button
                              onClick={() => handleAcceptTrade(trade.id)}
                              className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectTrade(trade.id)}
                              className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isTradeInitiator(trade) && (
                          <button
                            onClick={() => handleRejectTrade(trade.id)}
                            className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Trade Body - 3 columns, all vertically aligned */}
                  <div className="p-4">
                    <div className="flex flex-row items-center min-h-[56px]">
                      {/* Initiator Squad (col 1) */}
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          <div
                            className="w-1.5 h-4 rounded-md mr-2"
                            style={{
                              backgroundColor: trade.initiator_color || '#6366F1'
                            }}
                          ></div>
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                            {trade.initiator_name}
                            {/* {isTradeInitiator(trade) && <span className="ml-1 text-xs">(You)</span>} */}
                          </span>
                        </div>
                      </div>
                      {/* Traded Players (col 2, vertical stack, arrows) */}
                      <div className="flex flex-col items-center flex-[2] min-w-0">
                        {/* Initiator -> Receiver */}
                        {trade.players_given_details?.length > 0 && (
                          <div className="flex items-center mb-1">
                            <div className="flex flex-col items-end mr-2">
                              {trade.players_given_details.map((p, idx) => (
                                <span
                                  key={p.id}
                                  className={`text-xs ${
                                    trade.status === 'Rejected'
                                      ? 'text-neutral-400 dark:text-neutral-600 line-through'
                                      : 'text-neutral-700 dark:text-neutral-200'
                                  }`}
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                            <ArrowRight className="h-3 w-3 text-blue-500 dark:text-blue-400 " style={{color: trade.receiver_color || '#3B82F6'}} />
                          </div>
                        )}
                        {/* Receiver -> Initiator */}
                        {trade.players_received_details?.length > 0 && (
                          <div className="flex items-center mt-1">
                            <ArrowLeft className="h-3 w-3 text-green-600 dark:text-green-400" style={{color: trade.initiator_color || '#22C55E'}} />
                            <div className="flex flex-col items-start ml-2">
                              {trade.players_received_details.map((p, idx) => (
                                <span
                                  key={p.id}
                                  className={`text-xs ${
                                    trade.status === 'Rejected'
                                      ? 'text-neutral-400 dark:text-neutral-600 line-through'
                                      : 'text-neutral-700 dark:text-neutral-200'
                                  }`}
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* No players */}
                        {(!trade.players_given_details?.length && !trade.players_received_details?.length) && (
                          <span className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                            No players in this trade
                          </span>
                        )}
                      </div>
                      {/* Receiver Squad (col 3) */}
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                            {trade.receiver_name}
                            {/* {isTradeReceiver(trade) && <span className="ml-1 text-xs">(You)</span>} */}
                          </span>
                          <div
                            className="w-1.5 h-4 rounded-md ml-2"
                            style={{
                              backgroundColor: trade.receiver_color || '#8B5CF6'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {filteredTrades.length > tradesPerPage && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-sm font-medium rounded-md ${
                      currentPage === 1 
                        ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' 
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-sm font-medium rounded-md ${
                      currentPage === totalPages 
                        ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' 
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      Showing <span className="font-medium">{indexOfFirstTrade + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastTrade, filteredTrades.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredTrades.length}</span> trades
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-medium ${
                          currentPage === 1 
                            ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' 
                            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {(() => {
                        let pages = [];
                        let startPage = Math.max(1, currentPage - 2);
                        let endPage = Math.min(totalPages, startPage + 4);
                        
                        if (endPage - startPage < 4) {
                          startPage = Math.max(1, endPage - 4);
                        }
                        
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(i);
                        }
                        
                        return pages.map(page => (
                          <button
                            key={page}
                            onClick={() => paginate(page)}
                            className={`relative inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-neutral-50 dark:bg-neutral-900/30 border-primary-500 dark:border-primary-500 text-primary-600 dark:text-primary-300'
                                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                            }`}
                          >
                            {page}
                          </button>
                        ));
                      })()}
                      
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-medium ${
                          currentPage === totalPages 
                            ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' 
                            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TradeList;