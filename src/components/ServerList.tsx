import { Server as ServerIcon, Trash2, AlertCircle } from 'lucide-react';
import { Server } from '../types';
import { deleteServer } from '../api';
import { isAgentOutdated, getLatestAgentVersion, getAgentDisplayName } from '../utils';

interface ServerListProps {
  servers: Server[];
  onSelectServer: (serverId: string) => void;
  onServerDeleted?: () => void;
}

export function ServerList({ servers, onSelectServer, onServerDeleted }: ServerListProps) {
  const handleDelete = async (e: React.MouseEvent, serverId: string, serverName: string) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete server "${serverName}"? This will also delete all associated services.`)) {
      return;
    }

    try {
      await deleteServer(serverId);
      if (onServerDeleted) {
        onServerDeleted();
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
      alert('Failed to delete server');
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  if (servers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No servers configured yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {servers.map((server) => {
        const activeServices = server.services?.filter(s => s.status === 'active' || s.status === 'up').length || 0;
        const downServices = server.services?.filter(s => s.status === 'inactive' || s.status === 'down').length || 0;
        const totalServices = server.services?.length || 0;

        const statusDotColor = downServices > 0 ? 'bg-red-500' : activeServices > 0 ? 'bg-green-500' : 'bg-gray-400';

        return (
          <div
            key={server.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                onClick={() => onSelectServer(server.id)}
                className="flex items-center gap-3 flex-1 cursor-pointer"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ServerIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusDotColor}`}></div>
                    <h3 className="font-semibold text-gray-900">{server.name}</h3>
                  </div>
                  {server.os && (
                    <p className="text-sm text-gray-500">{server.os} {server.os_version}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {activeServices > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-900">
                    {activeServices} UP
                  </span>
                )}
                {downServices > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900">
                    {downServices} DOWN
                  </span>
                )}
                <button
                  onClick={(e) => handleDelete(e, server.id, server.name)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Delete Server"
                >
                  <Trash2 size={16} className="text-gray-400 group-hover:text-red-600" />
                </button>
              </div>
            </div>

            <div
              onClick={() => onSelectServer(server.id)}
              className="cursor-pointer space-y-2"
            >
              {server.description && (
                <p className="text-sm text-gray-700">{server.description}</p>
              )}

              {server.notes && (
                <p className="text-xs text-gray-600 italic">{server.notes}</p>
              )}

              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-700">{totalServices} services monitored</span>
                {server.last_seen && (
                  <span className="text-xs text-gray-500">Seen: {getRelativeTime(server.last_seen)}</span>
                )}
              </div>

              {server.ip_address && (
                <div className="text-xs text-gray-500">
                  IP: {server.ip_address}
                </div>
              )}

              {server.agent_type && server.agent_version && (
                <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                  {getAgentDisplayName(server.agent_type)} v{server.agent_version}
                  {isAgentOutdated(server.agent_type, server.agent_version) && (
                    <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-medium">
                      <AlertCircle size={12} />
                      Update to v{getLatestAgentVersion(server.agent_type)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
