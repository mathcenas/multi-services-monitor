import { Server as ServerIcon, Trash2 } from 'lucide-react';
import { Server } from '../types';
import { deleteServer } from '../api';

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
        const activeServices = server.services?.filter(s => s.status === 'active').length || 0;
        const downServices = server.services?.filter(s => s.status === 'inactive').length || 0;
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
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {activeServices} active
                  </span>
                )}
                {downServices > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {downServices} down
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
              className="cursor-pointer"
            >
              {server.notes && (
                <p className="text-sm text-gray-600 mb-3">{server.notes}</p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{totalServices} services monitored</span>
                {server.last_seen && (
                  <span className="text-xs">Last seen: {new Date(server.last_seen).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
