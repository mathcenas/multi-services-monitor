import { useState, useEffect } from 'react';
import { Server } from '../types';
import { api } from '../api';
import { Plus, Edit2, Trash2, Server as ServerIcon, AlertCircle } from 'lucide-react';
import { ServerForm } from './ServerForm';

export function ServerList({ onSelectServer }: { onSelectServer: (server: Server) => void }) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data);
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this server?')) return;

    try {
      await api.deleteServer(id);
      loadServers();
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingServer(null);
    loadServers();
  };

  if (loading) {
    return <div className="text-center py-8">Loading servers...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Servers</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Server
        </button>
      </div>

      {showForm && (
        <ServerForm
          server={editingServer}
          onClose={handleFormClose}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ServerIcon size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{server.name}</h3>
                  <p className="text-sm text-gray-500">{server.cloud_provider}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingServer(server);
                    setShowForm(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(server.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Hostname:</span>
                <span className="ml-2 text-gray-900">{server.hostname}</span>
              </div>
              <div>
                <span className="text-gray-500">IP:</span>
                <span className="ml-2 text-gray-900">{server.ip_address || 'N/A'}</span>
              </div>
              {server.description && (
                <div>
                  <span className="text-gray-500">Description:</span>
                  <p className="text-gray-900 mt-1">{server.description}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Services:</span>
                <span className="font-semibold text-gray-900">{server.service_count || 0}</span>
                {server.services_down > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle size={16} />
                    {server.services_down} down
                  </span>
                )}
              </div>
              <button
                onClick={() => onSelectServer(server)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage Services
              </button>
            </div>
          </div>
        ))}
      </div>

      {servers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No servers configured yet. Add your first server to get started.
        </div>
      )}
    </div>
  );
}
