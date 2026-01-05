import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Server, Activity, Plus, Edit2, ExternalLink, Copy, Check, Trash2 } from 'lucide-react';
import { Client } from '../types';
import { getClientById, deleteClient } from '../api';
import { ServerList } from './ServerList';

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
  onEdit: (client: Client) => void;
  onAddServer: (clientId: string) => void;
  onAddITService: (clientId: string) => void;
  onSelectServer: (serverId: string) => void;
  onViewPortal: (slug: string) => void;
}

export function ClientDetail({
  clientId,
  onBack,
  onEdit,
  onAddServer,
  onAddITService,
  onSelectServer,
  onViewPortal
}: ClientDetailProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'servers' | 'services'>('servers');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  async function loadClient() {
    try {
      setLoading(true);
      const data = await getClientById(clientId);
      setClient(data);
    } catch (error) {
      console.error('Failed to load client:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal/${client?.portal_slug || client?.id}`;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    if (!client) return;

    if (!confirm(`Are you sure you want to delete client "${client.name}"? This will also delete all associated servers, services, and IT services.`)) {
      return;
    }

    try {
      await deleteClient(client.id);
      onBack();
    } catch (error) {
      console.error('Failed to delete client:', error);
      alert('Failed to delete client');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to clients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Clients
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                {client.contact_person && (
                  <p className="text-gray-600 mt-1">Contact: {client.contact_person}</p>
                )}
                {client.contact_email && (
                  <p className="text-sm text-gray-500">{client.contact_email}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => onViewPortal(client.portal_slug || client.id)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Portal
              </button>
              <button
                onClick={handleCopyPortalLink}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Portal Link
                  </>
                )}
              </button>
              <button
                onClick={() => onEdit(client)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>

          {client.description && (
            <p className="mt-4 text-gray-600">{client.description}</p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Servers</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {client.servers?.length || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">IT Services</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {client.it_services?.length || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Status</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {client.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-gray-400">Inactive</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('servers')}
              className={`flex-1 px-6 py-3 text-sm font-medium focus:outline-none transition-colors ${
                activeTab === 'servers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Server className="h-4 w-4 inline mr-2" />
              Servers & Monitoring
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 px-6 py-3 text-sm font-medium focus:outline-none transition-colors ${
                activeTab === 'services'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              IT Services Catalog
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'servers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Monitored Servers</h3>
                <button
                  onClick={() => onAddServer(client.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Server
                </button>
              </div>

              {client.servers && client.servers.length > 0 ? (
                <ServerList
                  servers={client.servers}
                  onSelectServer={onSelectServer}
                  onServerDeleted={loadClient}
                />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Server className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No servers</h3>
                  <p className="mt-1 text-sm text-gray-500">Add a server to start monitoring</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">IT Services Provided</h3>
                <button
                  onClick={() => onAddITService(client.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </button>
              </div>

              {client.it_services && client.it_services.length > 0 ? (
                <div className="space-y-3">
                  {client.it_services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-base font-medium text-gray-900">{service.service_name}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {service.service_category}
                            </span>
                            {service.sla_level && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {service.sla_level}
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            {service.monthly_cost && (
                              <span>${service.monthly_cost}/month</span>
                            )}
                            {service.start_date && (
                              <span>Since {new Date(service.start_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : service.status === 'planned'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No IT services</h3>
                  <p className="mt-1 text-sm text-gray-500">Add IT services to showcase your work</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
