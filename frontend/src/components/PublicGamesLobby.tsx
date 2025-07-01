import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Users, Clock, Trophy, DollarSign, Filter, Search, RefreshCw, Play, Eye, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { battleshipGameStorage } from '../lib/gameStorage';

interface PublicGame {
  id: string;
  creatorName?: string;
  creatorAddress: string;
  gameMode: string;
  wagerAmount: number;
  createdAt: string;
  status: 'waiting' | 'playing' | 'finished';
  playersCount: number;
  maxPlayers: number;
  estimatedDuration: string;
  isSpectatable: boolean;
}

interface PublicGamesLobbyProps {
  onJoinGame: (gameId: string) => void;
  onSpectateGame?: (gameId: string) => void;
  className?: string;
}

const PublicGamesLobby: React.FC<PublicGamesLobbyProps> = ({
  onJoinGame,
  onSpectateGame,
  className = ''
}) => {
  const { publicKey } = useWallet();
  const [games, setGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'playing' | 'finished'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'wager' | 'players'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch public games
  const fetchPublicGames = async () => {
    setLoading(true);
    try {
      const response = await battleshipGameStorage.getPublicGames();
      if (response.success && response.games) {
        // Transform backend data to our format
        const transformedGames: PublicGame[] = response.games.map((game: any) => ({
          id: game.id,
          creatorName: game.creatorName || 'Anonymous Admiral',
          creatorAddress: game.creatorAddress || '',
          gameMode: game.gameMode || 'standard',
          wagerAmount: game.wagerAmount || 0,
          createdAt: game.createdAt,
          status: game.status || 'waiting',
          playersCount: game.playersCount || 1,
          maxPlayers: 2,
          estimatedDuration: getEstimatedDuration(game.gameMode),
          isSpectatable: game.status === 'playing'
        }));
        setGames(transformedGames);
      }
    } catch (error) {
      console.error('Error fetching public games:', error);
      toast.error('Failed to load public games');
    } finally {
      setLoading(false);
    }
  };

  // Get estimated duration based on game mode
  const getEstimatedDuration = (gameMode: string): string => {
    switch (gameMode) {
      case 'quick': return '5-10 min';
      case 'standard': return '15-25 min';
      case 'extended': return '30-45 min';
      default: return '15-25 min';
    }
  };

  // Filter and sort games
  const filteredAndSortedGames = games
    .filter(game => {
      // Status filter
      if (filterStatus !== 'all' && game.status !== filterStatus) return false;
      
      // Search filter
      if (searchTerm && !game.creatorName?.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !game.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'wager':
          return b.wagerAmount - a.wagerAmount;
        case 'players':
          return b.playersCount - a.playersCount;
        default:
          return 0;
      }
    });

  // Auto-refresh games
  useEffect(() => {
    fetchPublicGames();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchPublicGames, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle join game
  const handleJoinGame = (gameId: string, creatorAddress: string) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (publicKey.toString() === creatorAddress) {
      toast.error('You cannot join your own game');
      return;
    }
    
    onJoinGame(gameId);
  };

  // Handle spectate game
  const handleSpectateGame = (gameId: string) => {
    if (!onSpectateGame) {
      toast.info('Spectating not yet implemented');
      return;
    }
    onSpectateGame(gameId);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'playing': return 'text-green-600 bg-green-100';
      case 'finished': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get wager color
  const getWagerColor = (amount: number) => {
    if (amount === 0) return 'text-gray-600';
    if (amount < 1) return 'text-green-600';
    if (amount < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-blue-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-3 rounded-full">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Admiral's Harbor
              </h2>
              <p className="text-gray-600 text-sm">Join public battles • {games.length} active games</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-1" />
              Filters
            </button>
            
            <button
              onClick={fetchPublicGames}
              disabled={loading}
              className="px-3 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh games"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by admiral name or game ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Games</option>
                  <option value="waiting">Waiting for Players</option>
                  <option value="playing">In Progress</option>
                  <option value="finished">Completed</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="wager">Highest Wager</option>
                  <option value="players">Most Players</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Games List */}
      <div className="p-6">
        {loading && games.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading battle reports...</p>
          </div>
        ) : filteredAndSortedGames.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-2">No battles found</p>
            <p className="text-gray-500 text-sm">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Be the first to create a public battle!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedGames.map((game) => (
              <div
                key={game.id}
                className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Game Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-800">
                        {game.creatorName}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}>
                        {game.status}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {game.gameMode}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{game.playersCount}/{game.maxPlayers}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{game.estimatedDuration}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span className={`font-medium ${getWagerColor(game.wagerAmount)}`}>
                          {game.wagerAmount} GOR
                        </span>
                      </div>
                      
                      <span className="text-xs">
                        {new Date(game.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 font-mono">
                      ID: {game.id.slice(0, 8)}...{game.id.slice(-8)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {game.status === 'waiting' && (
                      <button
                        onClick={() => handleJoinGame(game.id, game.creatorAddress)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Join Battle
                      </button>
                    )}
                    
                    {game.status === 'playing' && game.isSpectatable && (
                      <button
                        onClick={() => handleSpectateGame(game.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Spectate
                      </button>
                    )}
                    
                    {game.status === 'finished' && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                        <Star className="w-4 h-4" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicGamesLobby; 