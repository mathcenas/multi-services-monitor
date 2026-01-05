import { useEffect, useState } from 'react';
import { Building2, Server, Activity, CheckCircle2, XCircle, AlertCircle, HardDrive } from 'lucide-react';
import { Client } from '../types';
import { getClientById } from '../api';

interface ClientPortalProps {
  clientId: string;
}

export function ClientPortal({ clientId }: ClientPortalProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
    const interval = setInterval(loadClient, 60000);
    return () => clearInterval(interval);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Client Not Found</h2>
          <p className="mt-2 text-gray-600">The requested client portal could not be found.</p>
        </div>
      </div>
    );
  }

  const activeServers = client.servers?.length || 0;
  const totalServices = client.servers?.reduce((acc, server) => acc + (server.services?.length || 0), 0) || 0;
  const activeServices = client.servers?.reduce((acc, server) => {
    return acc + (server.services?.filter(s => s.status === 'active').length || 0);
  }, 0) || 0;
  const downServices = totalServices - activeServices;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12">
            <div className="flex items-center space-x-6">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="h-20 w-20 rounded-xl bg-white p-2 object-contain shadow-lg"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-white flex items-center justify-center shadow-lg">
                  <Building2 className="h-10 w-10 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{client.name}</h1>
                <p className="text-blue-100 mt-2">Infrastructure & Services Overview</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {client.description && (
              <div className="mb-8">
                <p className="text-gray-700 text-lg">{client.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <Server className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-900 mt-4">{activeServers}</p>
                <p className="text-blue-700 text-sm font-medium mt-1">Servers Monitored</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900 mt-4">{activeServices}</p>
                <p className="text-green-700 text-sm font-medium mt-1">Services Active</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                <div className="flex items-center justify-between">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-900 mt-4">{downServices}</p>
                <p className="text-red-700 text-sm font-medium mt-1">Services Down</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <Activity className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-yellow-900 mt-4">{client.it_services?.length || 0}</p>
                <p className="text-yellow-700 text-sm font-medium mt-1">IT Services</p>
              </div>
            </div>

            {client.it_services && client.it_services.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Activity className="h-6 w-6 mr-2 text-blue-600" />
                  IT Services Provided
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.it_services.filter(s => s.status === 'active').map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900">{service.service_name}</h3>
                            {service.sla_level && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                {service.sla_level}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{service.service_category}</p>
                          {service.description && (
                            <p className="text-sm text-gray-700 mt-2">{service.description}</p>
                          )}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {client.servers && client.servers.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Server className="h-6 w-6 mr-2 text-blue-600" />
                  Server Status
                </h2>
                <div className="space-y-4">
                  {client.servers.map((server) => {
                    const servicesCount = server.services?.length || 0;
                    const activeCount = server.services?.filter(s => s.status === 'active').length || 0;
                    const downCount = servicesCount - activeCount;

                    return (
                      <div
                        key={server.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{server.name}</h3>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              {server.os && <span>{server.os}</span>}
                              {server.os_version && <span>v{server.os_version}</span>}
                              {server.last_seen && (
                                <span className="text-xs">
                                  Last seen: {new Date(server.last_seen).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              {activeCount} Active
                            </span>
                            {downCount > 0 && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                {downCount} Down
                              </span>
                            )}
                          </div>
                        </div>

                        {server.services && server.services.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                            {server.services.map((service) => (
                              <div
                                key={service.id}
                                className={`p-4 rounded-lg border-2 ${
                                  service.status === 'active'
                                    ? 'bg-green-50 border-green-200'
                                    : service.status === 'inactive'
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{service.name}</p>
                                    {service.version && (
                                      <p className="text-xs text-gray-600 mt-1">v{service.version}</p>
                                    )}
                                    {service.message && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{service.message}</p>
                                    )}
                                    {service.disk_usage !== undefined && service.disk_usage !== null && (
                                      <div className="mt-2 flex items-center space-x-2">
                                        <HardDrive className="h-3 w-3 text-gray-500" />
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                            <span>Disk</span>
                                            <span>{service.disk_usage}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                              className={`h-1.5 rounded-full ${
                                                service.disk_usage >= 90
                                                  ? 'bg-red-600'
                                                  : service.disk_usage >= 75
                                                  ? 'bg-yellow-600'
                                                  : 'bg-green-600'
                                              }`}
                                              style={{ width: `${service.disk_usage}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {service.status === 'active' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                                  ) : service.status === 'inactive' ? (
                                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Last updated: {new Date().toLocaleString()} • Refreshes automatically every minute
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
