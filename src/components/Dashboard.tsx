import { useState, useEffect } from 'react';
import { DashboardServer, Service } from '../types';
import { getDashboard } from '../api';
import { Server, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, HardDrive, Archive, AlertCircle, Info, Terminal, Cpu, MemoryStick } from 'lucide-react';
import { getRelativeTime, groupServicesByType, isBackupService, getBackupAgeStatus, getBackupStatusColors, getBackupStatusLabel, isAgentOutdated, getLatestAgentVersion, getAgentDisplayName } from '../utils';

type FilterMode = 'all' | 'issues' | 'critical-disks';

export function Dashboard() {
  const [servers, setServers] = useState<DashboardServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [groupByType, setGroupByType] = useState(false);
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const [sortCriticalFirst, setSortCriticalFirst] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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

  const toggleServiceExpansion = (serviceId: number) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
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
    let totalBackups = 0;
    let freshBackups = 0;
    let agingBackups = 0;
    let staleBackups = 0;
    let criticalBackups = 0;

    servers.forEach(server => {
      server.services.forEach(service => {
        const status = service.current_status || service.status;
        const lastCheck = service.last_checked || service.last_check;

        totalServices++;
        if (status === 'up' || status === 'active') {
          activeServices++;
        } else if (status === 'down' || status === 'inactive') {
          downServices++;
        }
        if (isDiskCritical(service)) {
          diskCritical++;
        }

        if (isBackupService(service.name)) {
          totalBackups++;
          const backupStatus = getBackupAgeStatus(lastCheck);
          if (backupStatus === 'fresh') freshBackups++;
          else if (backupStatus === 'aging') agingBackups++;
          else if (backupStatus === 'stale') staleBackups++;
          else if (backupStatus === 'critical') criticalBackups++;
        }
      });
    });

    return { totalServices, activeServices, downServices, diskCritical, totalBackups, freshBackups, agingBackups, staleBackups, criticalBackups };
  };

  const filterServers = (servers: DashboardServer[]): DashboardServer[] => {
    if (filterMode === 'all') return servers;

    return servers.map(server => {
      const filteredServices = server.services.filter(service => {
        const status = service.current_status || service.status;
        if (filterMode === 'issues') {
          return status === 'down' || status === 'inactive' || isDiskCritical(service);
        }
        if (filterMode === 'critical-disks') {
          return isDiskCritical(service);
        }
        return true;
      });

      return { ...server, services: filteredServices };
    }).filter(server => server.services.length > 0);
  };

  const sortServers = (servers: DashboardServer[]): DashboardServer[] => {
    if (!sortCriticalFirst) return servers;

    return [...servers].sort((a, b) => {
      const summaryA = getServerSummary(a);
      const summaryB = getServerSummary(b);

      const priorityA = summaryA.down > 0 || summaryA.diskCritical > 0 ? 0 : 1;
      const priorityB = summaryB.down > 0 || summaryB.diskCritical > 0 ? 0 : 1;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return (summaryB.down + summaryB.diskCritical) - (summaryA.down + summaryA.diskCritical);
    });
  };

  const getNextCheckTime = (lastChecked: string | null, checkInterval: number): string => {
    if (!lastChecked) return 'Unknown';
    const lastCheckTime = new Date(lastChecked).getTime();
    const nextCheckTime = lastCheckTime + (checkInterval * 60 * 1000);
    const now = Date.now();
    const diff = nextCheckTime - now;

    if (diff <= 0) return 'Due now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const renderService = (service: Service, server: DashboardServer) => {
    const status = service.current_status || service.status;
    const message = service.current_message || service.message;
    const lastCheck = service.last_checked || service.last_check;

    const isActive = status === 'up' || status === 'active';
    const isDown = status === 'down' || status === 'inactive';
    const hasDiskCritical = isDiskCritical(service);
    const isBackup = isBackupService(service.name);
    const backupStatus = isBackup ? getBackupAgeStatus(lastCheck) : null;
    const backupColors = backupStatus ? getBackupStatusColors(backupStatus) : null;
    const isExpanded = expandedServices.has(service.id);

    let cardClasses = '';
    if (isDown || hasDiskCritical) {
      cardClasses = 'border-red-200 bg-red-50';
    } else if (isBackup && backupColors) {
      cardClasses = `${backupColors.bg} ${backupColors.border}`;
    } else if (isActive) {
      cardClasses = 'border-green-200 bg-green-50';
    } else {
      cardClasses = 'border-gray-200 bg-gray-50';
    }

    return (
      <div
        key={service.id}
        className={`p-4 rounded-lg border-2 ${cardClasses} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => toggleServiceExpansion(service.id)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
            {server.client && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">{server.client.name}</span> • {server.name}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {hasDiskCritical && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  <HardDrive size={10} />
                  Disk Critical
                </span>
              )}
              {isBackup && backupStatus && backupColors && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${backupColors.badge}`}>
                  <Archive size={10} />
                  {getBackupStatusLabel(backupStatus)}
                </span>
              )}
              {isBackup && message && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  {message}
                </span>
              )}
              {service.version && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  v{service.version}
                </span>
              )}
            </div>
          </div>
          {isBackup && backupColors ? (
            <Archive size={20} className={backupColors.icon} />
          ) : hasDiskCritical ? (
            <HardDrive size={20} className="text-red-600" />
          ) : isActive ? (
            <CheckCircle size={20} className="text-green-600" />
          ) : isDown ? (
            <XCircle size={20} className="text-red-600" />
          ) : (
            <Clock size={20} className="text-gray-400" />
          )}
        </div>

        <div className="space-y-1.5 text-xs text-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-600">Type:</span> <span className="font-medium">{service.type || 'systemd'}</span>
              {service.job_type && <span className="ml-2"><span className="font-medium text-gray-600">Job:</span> <span className="font-medium">{service.job_type}</span></span>}
            </div>
            {status && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                isActive ? 'bg-green-200 text-green-900' :
                isDown ? 'bg-red-200 text-red-900' :
                'bg-gray-200 text-gray-900'
              }`}>
                {status.toUpperCase()}
              </span>
            )}
          </div>

          {service.description && (
            <div className="pt-1 border-t border-gray-300">
              <span className="font-medium text-gray-600">Description:</span>{' '}
              <span>{service.description}</span>
            </div>
          )}

          {lastCheck && (
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-medium text-gray-600">Last:</span>{' '}
                <span>{getRelativeTime(lastCheck)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Next:</span>{' '}
                <span>{getNextCheckTime(lastCheck, service.check_interval)}</span>
              </div>
            </div>
          )}

          {service.disk_usage != null && service.disk_path && (
            <div className="pt-1 border-t border-gray-300">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-600 flex items-center gap-1">
                  <HardDrive size={12} />
                  Disk: {service.disk_path}
                </span>
                <span className={`font-bold ${
                  service.disk_usage === 100 ? 'text-red-900 animate-pulse' :
                  hasDiskCritical ? 'text-red-700' :
                  service.disk_usage >= 70 ? 'text-orange-700' :
                  'text-green-700'
                }`}>
                  {service.disk_usage.toFixed(1)}%
                  {service.disk_usage === 100 && (
                    <span className="ml-1 text-xs font-black">FULL!</span>
                  )}
                </span>
              </div>
              {service.disk_used && service.disk_total && (
                <div className="text-gray-600 text-xs">
                  {service.disk_used} used / {service.disk_total} total
                  {service.disk_available && <span> • {service.disk_available} free</span>}
                </div>
              )}
            </div>
          )}

          {message && !isBackup && (
            <div className="pt-1 border-t border-gray-300">
              <span className="font-medium text-gray-600">Message:</span>{' '}
              <span className="italic">{message}</span>
            </div>
          )}

          {isExpanded && (
            <>
              {service.check_command && (
                <div className="pt-2 mt-1 border-t-2 border-gray-400">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Terminal size={12} className="text-gray-600" />
                    <span className="font-medium text-gray-600">Check Command:</span>
                  </div>
                  <code className="block text-xs bg-white bg-opacity-50 px-2 py-1 rounded break-all font-mono">{service.check_command}</code>
                  <p className="text-xs text-gray-500 mt-1.5 italic">
                    Status is <span className="font-semibold text-green-700">GREEN</span> if command exits with code 0 (or returns true),{' '}
                    <span className="font-semibold text-red-700">RED</span> if non-zero (or returns false)
                  </p>
                </div>
              )}
              {service.check_interval && (
                <div className="pt-1">
                  <span className="font-medium text-gray-600">Check Interval:</span>{' '}
                  <span>{service.check_interval} seconds ({Math.floor(service.check_interval / 60)} min)</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const stats = getOverallStats();
  const filteredServers = sortServers(filterServers(servers));

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStatusHelp(!showStatusHelp)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Info size={18} />
            {showStatusHelp ? 'Hide' : 'How Status Works'}
          </button>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('issues')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterMode === 'issues'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Issues Only
            </button>
            <button
              onClick={() => setFilterMode('critical-disks')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filterMode === 'critical-disks'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Critical Disks
            </button>
          </div>
          <button
            onClick={() => setGroupByType(!groupByType)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              groupByType
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Group by Type
          </button>
          <button
            onClick={() => setSortCriticalFirst(!sortCriticalFirst)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              sortCriticalFirst
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Critical First
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {stats.diskCritical > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900">URGENT: Critical Disk Usage Detected</h3>
              <p className="text-sm text-red-700 mt-1">
                {stats.diskCritical} disk{stats.diskCritical !== 1 ? 's' : ''} at 90% or higher capacity.
                Immediate action required to prevent system failures.
              </p>
            </div>
            <button
              onClick={() => setFilterMode('critical-disks')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              View Critical Disks
            </button>
          </div>
        </div>
      )}

      {showStatusHelp && (
        <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Terminal size={24} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">How Status Checking Works</h3>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-semibold text-gray-900 mb-2">Each service has a check command that runs periodically:</p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><span className="font-semibold text-green-700">GREEN (UP)</span> - Command exits with code 0 or returns true</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">✗</span>
                      <span><span className="font-semibold text-red-700">RED (DOWN)</span> - Command exits with non-zero code or returns false</span>
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="font-semibold text-gray-900 mb-2">Linux Examples:</p>
                    <code className="block text-xs bg-gray-50 px-2 py-1 rounded mb-1 font-mono">systemctl is-active apache2</code>
                    <code className="block text-xs bg-gray-50 px-2 py-1 rounded mb-1 font-mono">docker ps --filter name=nginx -q</code>
                    <code className="block text-xs bg-gray-50 px-2 py-1 rounded font-mono">curl -sf http://localhost/health</code>
                  </div>

                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="font-semibold text-gray-900 mb-2">Windows Examples:</p>
                    <code className="block text-xs bg-gray-50 px-2 py-1 rounded mb-1 font-mono">(Get-Service "W3SVC").Status -eq "Running"</code>
                    <code className="block text-xs bg-gray-50 px-2 py-1 rounded font-mono">Test-Path "C:\inetpub"</code>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Info size={14} className="text-blue-600" />
                    View Check Commands
                  </p>
                  <p className="text-gray-600">Click any service card to expand and see its check command and interval.</p>
                </div>

                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Terminal size={14} className="text-blue-600" />
                    View Agent Logs
                  </p>
                  <p className="text-gray-600 mb-2">Check agent logs for detailed status check results:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Linux:</span>
                      <code className="block bg-gray-50 px-2 py-1 rounded mt-1 font-mono">sudo journalctl -u monitor-agent -f</code>
                    </div>
                    <div>
                      <span className="font-medium">Windows:</span>
                      <code className="block bg-gray-50 px-2 py-1 rounded mt-1 font-mono">Get-Service MonitorAgent</code>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">See AGENT-LOGS.md for complete documentation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {stats.totalBackups > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Archive size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Backup Status</h3>
                <p className="text-sm text-gray-500">{stats.totalBackups} backup job{stats.totalBackups !== 1 ? 's' : ''} monitored</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Recent</span>
                  <CheckCircle size={16} className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.freshBackups}</p>
                <p className="text-xs text-green-600 mt-1">&lt; 24h ago</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-700">Aging</span>
                  <Clock size={16} className="text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-700">{stats.agingBackups}</p>
                <p className="text-xs text-yellow-600 mt-1">24-48h ago</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Stale</span>
                  <AlertTriangle size={16} className="text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-700">{stats.staleBackups}</p>
                <p className="text-xs text-orange-600 mt-1">48-72h ago</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">Critical</span>
                  <XCircle size={16} className="text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-700">{stats.criticalBackups}</p>
                <p className="text-xs text-red-600 mt-1">&gt; 72h ago</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredServers.map(server => {
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

          const agentOutdated = isAgentOutdated(server.agent_type, server.agent_version);
          const latestVersion = getLatestAgentVersion(server.agent_type);

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
                        <p className="text-sm text-gray-600">
                          {server.client && <span className="font-medium text-blue-600">{server.client.name}</span>}
                          {server.client && ' • '}
                          {server.hostname} • {server.cloud_provider}
                        </p>
                        {server.agent_type && server.agent_version && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {getAgentDisplayName(server.agent_type)} v{server.agent_version}
                            {agentOutdated && latestVersion && (
                              <span className="ml-2 text-orange-600 font-medium">
                                (Update available: v{latestVersion})
                              </span>
                            )}
                          </p>
                        )}
                        {(server.cpu_usage != null || server.memory_usage != null) && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            {server.cpu_usage != null && (
                              <div className="flex items-center gap-1.5">
                                <Cpu size={14} className={server.cpu_usage > 80 ? 'text-red-600' : server.cpu_usage > 60 ? 'text-orange-600' : 'text-blue-600'} />
                                <span className={`font-medium ${server.cpu_usage > 80 ? 'text-red-700' : server.cpu_usage > 60 ? 'text-orange-700' : 'text-gray-700'}`}>
                                  CPU: {server.cpu_usage.toFixed(1)}%
                                </span>
                              </div>
                            )}
                            {server.memory_usage != null && (
                              <div className="flex items-center gap-1.5">
                                <MemoryStick size={14} className={server.memory_usage > 80 ? 'text-red-600' : server.memory_usage > 70 ? 'text-orange-600' : 'text-green-600'} />
                                <span className={`font-medium ${server.memory_usage > 80 ? 'text-red-700' : server.memory_usage > 70 ? 'text-orange-700' : 'text-gray-700'}`}>
                                  Memory: {server.memory_usage.toFixed(1)}%
                                </span>
                                {server.memory_used_mb && server.memory_total_mb && (
                                  <span className="text-gray-500">
                                    ({Math.round(server.memory_used_mb / 1024)}GB / {Math.round(server.memory_total_mb / 1024)}GB)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {agentOutdated && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        <AlertCircle size={14} />
                        Agent Update
                      </span>
                    )}
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
                ) : groupByType ? (
                  <div className="space-y-6">
                    {Array.from(groupServicesByType(server.services)).map(([type, services]) => (
                      <div key={type}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                          {type}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {services.map(service => renderService(service, server))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {server.services.map(service => renderService(service, server))}
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

      {filteredServers.length === 0 && servers.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          No servers match the current filter.
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-gray-700 font-mono">R</kbd>
            <span>Refresh</span>
          </div>
        </div>
      </div>
    </div>
  );
}
