import { useState, useEffect } from 'react';
import { DashboardServer, Service } from '../types';
import { getDashboard } from '../api';
import { Server, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, HardDrive } from 'lucide-react';

export function Dashboard() {
  const [servers, setServers] = useState<DashboardServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await getDashboard();
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

  const toggleServerExpansion = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const isDiskCritical = (service: Service): boolean => {
    if (service.disk_usage === undefined || service.disk_usage === null) return false;
    return service.disk_usage >= 90;
  };

  const getServerSummary = (server: DashboardServer) => {
    const down = server.services.filter(s => s.status === 'down' || s.status === 'inactive').length;
    const diskCritical = server.services.filter(s => isDiskCritical(s)).length;
    const active = server.services.filter(s => s.status === 'up' || s.status === 'active').length;

    return { down, diskCritical, updates: 0, active, total: server.services.length };
  };

  const getOverallStats = () => {
    let totalServices = 0;
    let activeServices = 0;
    let downServices = 0;
    let diskCritical = 0;

    servers.forEach(server => {
      server.services.forEach(service => {
        totalServices++;
        if (service.current_status === 'up' || service.current_status === 'active') {
          activeServices++;
        } else if (service.current_status === 'down' || service.current_status === 'inactive') {
          downServices++;
        }
        if (isDiskCritical(service)) {
          diskCritical++;
        }
      });
    });

    return { totalServices, activeServices, downServices, diskCritical };
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Critical Disks</p>
              <p className="text-3xl font-bold text-red-600">{stats.diskCritical}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <HardDrive size={24} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {servers.map(server => {
          const summary = getServerSummary(server);
          const isExpanded = expandedServers.has(server.id);

          let statusColor = 'bg-green-50 border-green-200';
          let badgeColor = 'bg-green-100 text-green-700';
          let statusIcon = <CheckCircle size={20} className="text-green-600" />;

          if (summary.down > 0 || summary.diskCritical > 0) {
            statusColor = 'bg-red-50 border-red-200';
            badgeColor = 'bg-red-100 text-red-700';
            statusIcon = <XCircle size={20} className="text-red-600" />;
          } else if (summary.updates > 0) {
            statusColor = 'bg-orange-50 border-orange-200';
            badgeColor = 'bg-orange-100 text-orange-700';
            statusIcon = <AlertTriangle size={20} className="text-orange-600" />;
          }

          return (
            <div key={server.id} className={`rounded-lg shadow-sm border-2 transition-all ${statusColor}`}>
              <div
                className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => toggleServerExpansion(server.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="flex items-center gap-3">
                      {statusIcon}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
                        <p className="text-sm text-gray-600">{server.hostname} • {server.cloud_provider}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {summary.down > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        {summary.down} down
                      </span>
                    )}
                    {summary.diskCritical > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        <HardDrive size={14} />
                        {summary.diskCritical} disk{summary.diskCritical !== 1 ? 's' : ''} critical
                      </span>
                    )}
                    {summary.updates > 0 && summary.down === 0 && summary.diskCritical === 0 && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        {summary.updates} update{summary.updates > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}>
                      {summary.total} service{summary.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 pt-2 border-t border-gray-200 bg-white">
                {server.services.length === 0 ? (
                  <p className="text-gray-500 text-sm">No services configured</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {server.services.map(service => {
                      const isActive = service.current_status === 'up' || service.current_status === 'active';
                      const isDown = service.current_status === 'down' || service.current_status === 'inactive';
                      const hasDiskCritical = isDiskCritical(service);

                      return (
                        <div
                          key={service.id}
                          className={`p-4 rounded-lg border-2 ${
                            isDown || hasDiskCritical
                              ? 'border-red-200 bg-red-50'
                              : isActive
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                              {server.client && (
                                <p className="text-xs text-gray-600 mb-1">{server.client.name}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {hasDiskCritical && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                    <HardDrive size={10} />
                                    Disk Critical
                                  </span>
                                )}
                                {service.version && (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                    v{service.version}
                                  </span>
                                )}
                              </div>
                            </div>
                            {hasDiskCritical ? (
                              <HardDrive size={20} className="text-red-600" />
                            ) : isActive ? (
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
                            {service.disk_usage != null && service.disk_path && (
                              <div>
                                <span className="font-medium">Disk Usage:</span>{' '}
                                <span className={hasDiskCritical ? 'text-red-600 font-semibold' : service.disk_usage >= 70 ? 'text-orange-600' : 'text-green-600'}>
                                  {service.disk_usage.toFixed(1)}%
                                </span>
                                {' '}({service.disk_path})
                              </div>
                            )}
                            {service.disk_used && service.disk_total && (
                              <div>
                                <span className="font-medium">Disk Space:</span> {service.disk_used} / {service.disk_total}
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
              )}
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
