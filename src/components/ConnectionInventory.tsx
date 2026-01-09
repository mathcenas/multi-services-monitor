import { useState, useEffect } from 'react';
import { NetworkConnection, ConnectionStats } from '../types';
import { getRelativeTime } from '../utils';
import { Users, Wifi, WifiOff, RefreshCw, Clock, Monitor, HardDrive, Globe, FileDown } from 'lucide-react';

interface ConnectionInventoryProps {
  serverId: string;
  serverName: string;
}

export function ConnectionInventory({ serverId, serverName }: ConnectionInventoryProps) {
  const [activeConnections, setActiveConnections] = useState<NetworkConnection[]>([]);
  const [recentConnections, setRecentConnections] = useState<NetworkConnection[]>([]);
  const [stats, setStats] = useState<ConnectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  const loadConnections = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/connections`);
      const data = await response.json();
      setActiveConnections(data.active || []);
      setRecentConnections(data.recent || []);
      setStats(data.stats || []);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConnections();
    const interval = setInterval(loadConnections, 30000);
    return () => clearInterval(interval);
  }, [serverId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConnections();
  };

  const handleExportPDF = () => {
    window.open(`/api/connections/export-pdf?serverId=${serverId}`, '_blank');
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol.toUpperCase()) {
      case 'SMB':
      case 'CIFS':
        return <HardDrive size={16} className="text-blue-600" />;
      case 'NFS':
        return <HardDrive size={16} className="text-green-600" />;
      case 'SSH':
        return <Monitor size={16} className="text-purple-600" />;
      case 'FTP':
        return <Globe size={16} className="text-orange-600" />;
      default:
        return <Wifi size={16} className="text-gray-600" />;
    }
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol.toUpperCase()) {
      case 'SMB':
      case 'CIFS':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'NFS':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'SSH':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FTP':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading connections...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Network Connections</h3>
          <p className="text-sm text-gray-600">{serverName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FileDown size={18} />
            Export PDF
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeConnections.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users size={20} className="text-green-600" />
              </div>
            </div>
          </div>
          {stats.map((stat) => (
            <div key={stat.protocol} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.protocol}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  {getProtocolIcon(stat.protocol)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="text-green-600" size={20} />
            <h4 className="font-semibold text-gray-900">Active Connections</h4>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              {activeConnections.length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Currently connected users and services</p>
        </div>

        {activeConnections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <WifiOff size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No active connections</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Protocol</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Hostname</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Share</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Connected</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getProtocolColor(conn.protocol)}`}>
                        {getProtocolIcon(conn.protocol)}
                        {conn.protocol}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-900">{conn.ip_address}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{conn.username || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{conn.hostname || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{conn.share_name || <span className="text-gray-400">-</span>}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {conn.connected_at ? getRelativeTime(conn.connected_at) : 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {getRelativeTime(conn.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-gray-600" size={20} />
              <h4 className="font-semibold text-gray-900">Recent Connections</h4>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                {recentConnections.length}
              </span>
            </div>
            <button
              onClick={() => setShowRecent(!showRecent)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showRecent ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Previously disconnected sessions</p>
        </div>

        {showRecent && (
          <>
            {recentConnections.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No recent disconnections</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Protocol</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Hostname</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Connected</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Disconnected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentConnections.map((conn) => (
                      <tr key={conn.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getProtocolColor(conn.protocol)}`}>
                            {getProtocolIcon(conn.protocol)}
                            {conn.protocol}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-900">{conn.ip_address}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{conn.username || <span className="text-gray-400">-</span>}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{conn.hostname || <span className="text-gray-400">-</span>}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {conn.connected_at ? getRelativeTime(conn.connected_at) : 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {conn.disconnected_at ? getRelativeTime(conn.disconnected_at) : 'Active'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
