import { useEffect, useState } from 'react';
import { Building2, Server, Activity, CheckCircle2, XCircle, AlertCircle, HardDrive } from 'lucide-react';
import { Client } from '../types';
import { getClientBySlug } from '../api';
import { getRelativeTime } from '../utils';

interface ClientPortalProps {
  slug: string;
}

export function ClientPortal({ slug }: ClientPortalProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
    const interval = setInterval(loadClient, 60000);
    return () => clearInterval(interval);
  }, [slug]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        loadClient();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [slug]);

  async function loadClient() {
    try {
      setLoading(true);
      const data = await getClientBySlug(slug);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-8 py-8">
            <div className="flex items-center space-x-4">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="h-16 w-16 rounded-lg bg-white p-2 object-contain"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-white flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                <p className="text-blue-100 mt-1 text-sm">Infrastructure & Services Overview</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {client.description && (
              <div className="mb-8">
                <p className="text-gray-700 text-lg">{client.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Servers</p>
                    <p className="text-3xl font-bold text-gray-900">{activeServers}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Server size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Active</p>
                    <p className="text-3xl font-bold text-green-600">{activeServices}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle2 size={24} className="text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Down</p>
                    <p className="text-3xl font-bold text-red-600">{downServices}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle size={24} className="text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">IT Services</p>
                    <p className="text-3xl font-bold text-gray-900">{client.it_services?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Activity size={24} className="text-gray-600" />
                  </div>
                </div>
              </div>
            </div>

            {client.it_services && client.it_services.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-600" />
                  IT Services Provided
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {client.it_services.filter(s => s.status === 'active').map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{service.service_name}</h3>
                            {service.sla_level && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {service.sla_level}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{service.service_category}</p>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                          )}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {client.servers && client.servers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Server className="h-5 w-5 mr-2 text-blue-600" />
                  Server Status
                </h2>
                <div className="space-y-3">
                  {client.servers.map((server) => {
                    const servicesCount = server.services?.length || 0;
                    const activeCount = server.services?.filter(s => s.status === 'active').length || 0;
                    const downCount = servicesCount - activeCount;

                    return (
                      <div
                        key={server.id}
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              {server.os && <span>{server.os}</span>}
                              {server.os_version && <span>v{server.os_version}</span>}
                              {server.last_seen && (
                                <span className="text-xs">
                                  Last seen: {getRelativeTime(server.last_seen)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                              {activeCount} active
                            </span>
                            {downCount > 0 && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                                {downCount} down
                              </span>
                            )}
                          </div>
                        </div>

                        {server.services && server.services.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {server.services.map((service) => (
                              <div
                                key={service.id}
                                className={`p-3 rounded-lg border ${
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
                                    {service.uptime_7days && service.uptime_7days.length > 0 && (
                                      <div className="mt-2">
                                        <div className="text-xs text-gray-600 mb-1">7-Day Uptime</div>
                                        <div className="flex items-center space-x-0.5">
                                          {service.uptime_7days.map((day, index) => (
                                            <div
                                              key={index}
                                              className={`h-6 flex-1 rounded ${
                                                day.uptime >= 99
                                                  ? 'bg-green-500'
                                                  : day.uptime >= 95
                                                  ? 'bg-yellow-500'
                                                  : day.uptime >= 50
                                                  ? 'bg-orange-500'
                                                  : 'bg-red-500'
                                              }`}
                                              title={`${day.date}: ${day.uptime}% uptime`}
                                            ></div>
                                          ))}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                          <span>{service.uptime_7days[0]?.date.slice(5)}</span>
                                          <span>Today</span>
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

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleString()} • Auto-refreshes every minute
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 font-mono">R</kbd>
                <span>Refresh</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
