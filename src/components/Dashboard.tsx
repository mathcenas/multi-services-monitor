import { useState, useEffect } from 'react';
import { DashboardServer, Service } from '../types';
import { api } from '../api';
import { Server, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const [servers, setServers] = useState<DashboardServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboard();
      setServers(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const compareVersions = (current: string, latest: string): number => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const curr = currentParts[i] || 0;
      const lat = latestParts[i] || 0;

      if (curr < lat) return -1;
      if (curr > lat) return 1;
    }

    return 0;
  };

  const needsUpdate = (service: Service): boolean => {
    if (!service.current_version || !service.latest_version) return false;
    return compareVersions(service.current_version, service.latest_version) < 0;
  };

  const getOverallStats = () => {
    let totalServices = 0;
    let activeServices = 0;
    let downServices = 0;

    servers.forEach(server => {
      server.services.forEach(service => {
        totalServices++;
        if (service.current_status === 'up' || service.current_status === 'active') {
          activeServices++;
        } else if (service.current_status === 'down' || service.current_status === 'inactive') {
          downServices++;
        }
      });
    });

    return { totalServices, activeServices, downServices };
  };

  const stats = getOverallStats();

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Services</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalServices}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Server size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Services</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeServices}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Down Services</p>
              <p className="text-3xl font-bold text-red-600">{stats.downServices}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {servers.map(server => {
          const serverDown = server.services.filter(s =>
            s.current_status === 'down' || s.current_status === 'inactive'
          ).length;

          return (
            <div key={server.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-500">{server.hostname} • {server.cloud_provider}</p>
                  </div>
                  {serverDown > 0 && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {serverDown} service{serverDown > 1 ? 's' : ''} down
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {server.services.length === 0 ? (
                  <p className="text-gray-500 text-sm">No services configured</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {server.services.map(service => {
                      const isActive = service.current_status === 'up' || service.current_status === 'active';
                      const isDown = service.current_status === 'down' || service.current_status === 'inactive';

                      return (
                        <div
                          key={service.id}
                          className={`p-4 rounded-lg border-2 ${
                            isActive
                              ? 'border-green-200 bg-green-50'
                              : isDown
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {service.current_version && (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                    v{service.current_version}
                                  </span>
                                )}
                                {service.latest_version && needsUpdate(service) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                    <AlertTriangle size={10} />
                                    v{service.latest_version} available
                                  </span>
                                )}
                                {service.latest_version && !needsUpdate(service) && service.current_version && (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                    Up to date
                                  </span>
                                )}
                              </div>
                            </div>
                            {isActive ? (
                              <CheckCircle size={20} className="text-green-600" />
                            ) : isDown ? (
                              <XCircle size={20} className="text-red-600" />
                            ) : (
                              <Clock size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Type:</span> {service.type}
                            </div>
                            {service.current_status && (
                              <div>
                                <span className="font-medium">Status:</span>{' '}
                                <span className={isActive ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-600'}>
                                  {service.current_status}
                                </span>
                              </div>
                            )}
                            {service.last_checked && (
                              <div>
                                <span className="font-medium">Last Check:</span>{' '}
                                {new Date(service.last_checked).toLocaleString()}
                              </div>
                            )}
                            {service.current_message && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <span className="font-medium">Message:</span> {service.current_message}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {servers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No servers configured yet. Add servers and services to start monitoring.
        </div>
      )}
    </div>
  );
}
