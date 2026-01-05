import { useEffect, useState } from 'react';
import { Building2, Plus, Users, Server, Activity } from 'lucide-react';
import { Client } from '../types';
import { getClients } from '../api';

interface ClientListProps {
  onSelectClient: (client: Client) => void;
  onAddClient: () => void;
}

export function ClientList({ onSelectClient, onAddClient }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-gray-600 mt-1">Manage your business clients and their infrastructure</p>
        </div>
        <button
          onClick={onAddClient}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first client.</p>
          <div className="mt-6">
            <button
              onClick={onAddClient}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={client.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      {client.contact_person && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Users className="h-3 w-3 mr-1" />
                          {client.contact_person}
                        </p>
                      )}
                    </div>
                  </div>
                  {!client.is_active && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>

                {client.description && (
                  <p className="mt-4 text-sm text-gray-600 line-clamp-2">{client.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <Server className="h-4 w-4 mr-1" />
                    <span>{client.servers?.length || 0} Servers</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>{client.it_services?.length || 0} Services</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
