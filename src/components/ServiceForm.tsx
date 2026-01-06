import { useState, useEffect } from 'react';
import { Service } from '../types';
import { createService, updateService } from '../api';
import { X, Info } from 'lucide-react';

interface ServiceFormProps {
  serverId: string;
  service?: Service;
  onSubmit: () => void;
  onClose: () => void;
}

export function ServiceForm({ serverId, service, onSubmit, onClose }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'systemd',
    check_command: '',
    description: '',
    check_interval: 300,
    disk_path: '',
    disk_threshold: 80,
    job_type: '',
  });
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        type: service.type || 'systemd',
        check_command: service.check_command,
        description: service.description || '',
        check_interval: service.check_interval || 300,
        disk_path: service.disk_path || '',
        disk_threshold: service.disk_threshold || 80,
        job_type: service.job_type || '',
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (service) {
        await updateService(service.id, formData);
      } else {
        await createService(serverId, formData);
      }
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Failed to save service:', error);
      alert('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {service ? 'Edit Service' : 'Add Service'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Info size={16} />
            {showHelp ? 'Hide' : 'Show'} Examples
          </button>

          {showHelp && (
            <div className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 text-sm">
              <div className="p-4 border-b border-blue-200 bg-white/50">
                <p className="font-semibold text-gray-900">Configuration Examples by Platform</p>
                <p className="text-xs text-gray-600 mt-1">Choose the setup that matches your infrastructure</p>
              </div>

              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Linux/Unix Platform */}
                <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Linux / Unix Servers</p>
                      <p className="text-xs text-blue-100">Agent: monitor-agent.sh</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Apache Web Server</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> apache2</p>
                        <p><span className="text-gray-500">Type:</span> systemd</p>
                        <p><span className="text-gray-500">Check Command:</span> systemctl is-active apache2</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Docker Container</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> nginx-container</p>
                        <p><span className="text-gray-500">Type:</span> docker</p>
                        <p><span className="text-gray-500">Check Command:</span> docker ps --filter name=nginx --filter status=running -q</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">NAS with Disk Monitoring</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Samba NAS</p>
                        <p><span className="text-gray-500">Type:</span> custom</p>
                        <p><span className="text-gray-500">Check Command:</span> systemctl is-active smbd</p>
                        <p><span className="text-gray-500">Disk Path:</span> /mnt/nas</p>
                        <p><span className="text-gray-500">Threshold:</span> 90%</p>
                      </div>
                      <p className="mt-1 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        Creates service check + separate disk monitor
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">MySQL Database</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> MySQL</p>
                        <p><span className="text-gray-500">Type:</span> systemd</p>
                        <p><span className="text-gray-500">Check Command:</span> systemctl is-active mysql</p>
                        <p><span className="text-gray-500">Disk Path:</span> /var/lib/mysql</p>
                        <p><span className="text-gray-500">Threshold:</span> 85%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Windows Platform */}
                <div className="bg-white rounded-lg shadow-sm border border-green-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Windows Servers</p>
                      <p className="text-xs text-green-100">Agent: monitor-agent.ps1 (PowerShell)</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">IIS Web Server</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> IIS</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> (Get-Service -Name "W3SVC").Status -eq "Running"</p>
                        <p><span className="text-gray-500">Disk Path:</span> C:\inetpub</p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">SQL Server</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> SQL Server</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> (Get-Service -Name "MSSQLSERVER").Status -eq "Running"</p>
                        <p><span className="text-gray-500">Disk Path:</span> D:\SQLData</p>
                        <p><span className="text-gray-500">Threshold:</span> 85%</p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">File Server (Network Drive)</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> R: Drive</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> Test-Path "R:\" -PathType Container</p>
                        <p><span className="text-gray-500">Disk Path:</span> R:\</p>
                        <p><span className="text-gray-500">Threshold:</span> 90%</p>
                      </div>
                      <p className="mt-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        Monitors both accessibility and disk space
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Windows Update Service</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Windows Update</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> (Get-Service -Name "wuauserv").Status -eq "Running"</p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">C: Drive Space</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> C: System Drive</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> Test-Path "C:\" -PathType Container</p>
                        <p><span className="text-gray-500">Disk Path:</span> C:\</p>
                        <p><span className="text-gray-500">Threshold:</span> 85%</p>
                      </div>
                      <p className="mt-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        Disk monitoring supports drive letters (C:, D:, etc.) and UNC paths
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Veeam Backup Service</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Veeam Backup</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> Get-Service -Name "VeeamBackupSvc"</p>
                        <p><span className="text-gray-500">Disk Path:</span> D:\VeeamBackup</p>
                        <p><span className="text-gray-500">Threshold:</span> 90%</p>
                      </div>
                      <p className="mt-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        Monitors Veeam service and backup repository disk space
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Veeam Agent for Windows</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Veeam Agent</p>
                        <p><span className="text-gray-500">Type:</span> windows</p>
                        <p><span className="text-gray-500">Check Command:</span> Get-Service -Name "VeeamEndpointBackupSvc"</p>
                      </div>
                      <p className="mt-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        For Veeam Agent for Windows installations
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-green-100 to-teal-100 border-2 border-green-300 rounded-lg p-3 shadow-sm">
                      <p className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                        <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">Smart Check</span>
                        Veeam Backup Job Status (Recommended)
                      </p>
                      <div className="space-y-2">
                        <div className="bg-white border border-green-200 rounded p-2">
                          <p className="font-medium text-gray-900 text-xs mb-1">24-Hour Backup Check (Default)</p>
                          <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                            <p><span className="text-gray-500">Name:</span> Veeam Daily Backup</p>
                            <p><span className="text-gray-500">Type:</span> windows</p>
                            <p><span className="text-gray-500">Check Command:</span> veeam-backup</p>
                          </div>
                          <p className="mt-2 text-xs text-gray-700 bg-green-50 px-2 py-1 rounded">
                            Checks Windows Event Log for successful Veeam backup completion within 24 hours
                          </p>
                        </div>

                        <div className="bg-white border border-green-200 rounded p-2">
                          <p className="font-medium text-gray-900 text-xs mb-1">12-Hour Backup Check (Frequent)</p>
                          <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                            <p><span className="text-gray-500">Name:</span> Veeam Frequent Backup</p>
                            <p><span className="text-gray-500">Type:</span> windows</p>
                            <p><span className="text-gray-500">Check Command:</span> veeam-backup 12</p>
                          </div>
                          <p className="mt-2 text-xs text-gray-700 bg-green-50 px-2 py-1 rounded">
                            For servers with multiple daily backups (every 12 hours)
                          </p>
                        </div>

                        <div className="bg-white border border-green-200 rounded p-2">
                          <p className="font-medium text-gray-900 text-xs mb-1">48-Hour Backup Check (Weekly)</p>
                          <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                            <p><span className="text-gray-500">Name:</span> Veeam Weekly Backup</p>
                            <p><span className="text-gray-500">Type:</span> windows</p>
                            <p><span className="text-gray-500">Check Command:</span> veeam-backup 48</p>
                          </div>
                          <p className="mt-2 text-xs text-gray-700 bg-green-50 px-2 py-1 rounded">
                            For servers with less frequent backup schedules
                          </p>
                        </div>

                        <div className="bg-teal-50 border border-teal-300 rounded p-2 mt-2">
                          <p className="font-semibold text-teal-900 text-xs mb-1">How it works:</p>
                          <ul className="text-xs text-gray-700 space-y-1 ml-3 list-disc">
                            <li>Scans Windows Event Log for Veeam backup events</li>
                            <li>Checks Event ID 190 (success), 110 (failure), 510 (warning)</li>
                            <li>Verifies last successful backup is within threshold</li>
                            <li>Reports backup age and detects failures after success</li>
                            <li>Works with Veeam Backup & Replication and Veeam Agent</li>
                          </ul>
                          <p className="mt-2 text-xs font-medium text-teal-800">
                            Syntax: <code className="bg-white px-2 py-0.5 rounded border border-teal-300">veeam-backup [max_hours]</code>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MikroTik Platform */}
                <div className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">MikroTik RouterOS</p>
                      <p className="text-xs text-orange-100">Agent: monitor-agent-mikrotik.sh (via SSH)</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-gray-900 text-xs">System Resources</p>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded">Auto</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">Monitored automatically by agent:</p>
                      <div className="text-xs text-gray-700 space-y-0.5">
                        <p>• CPU Load (with thresholds)</p>
                        <p>• RAM Usage (with thresholds)</p>
                        <p>• System Uptime</p>
                        <p>• RouterOS Version</p>
                        <p>• Temperature (if available)</p>
                        <p>• Voltage (if available)</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Ethernet Interface</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> LAN Interface</p>
                        <p><span className="text-gray-500">Type:</span> interface</p>
                        <p><span className="text-gray-500">Check Command:</span> ether1</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">PPPoE WAN Connection</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> WAN PPPoE</p>
                        <p><span className="text-gray-500">Type:</span> interface</p>
                        <p><span className="text-gray-500">Check Command:</span> pppoe-out1</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">SSH Service Status</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> SSH Service</p>
                        <p><span className="text-gray-500">Type:</span> service</p>
                        <p><span className="text-gray-500">Check Command:</span> ssh</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">API Service Status</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> API</p>
                        <p><span className="text-gray-500">Type:</span> service</p>
                        <p><span className="text-gray-500">Check Command:</span> api</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Custom RouterOS Command</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Active Connections</p>
                        <p><span className="text-gray-500">Type:</span> custom</p>
                        <p><span className="text-gray-500">Check Command:</span> /ip firewall connection print count-only</p>
                      </div>
                      <p className="mt-1 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                        Any valid RouterOS command can be used
                      </p>
                    </div>
                  </div>
                </div>

                {/* OpenMediaVault rsnapshot Platform */}
                <div className="bg-white rounded-lg shadow-sm border border-purple-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">OpenMediaVault rsnapshot</p>
                      <p className="text-xs text-purple-100">Agent: monitor-agent-rsnapshot.sh (Log Parser)</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="bg-purple-50 border border-purple-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Daily Backup Job</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Client Backup Daily</p>
                        <p><span className="text-gray-500">Type:</span> backup</p>
                        <p><span className="text-gray-500">Job Type:</span> daily</p>
                        <p><span className="text-gray-500">Check Command:</span> ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25</p>
                        <p><span className="text-gray-500">Disk Path:</span> /mnt/backup</p>
                      </div>
                      <p className="mt-1 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        Monitors daily backups (max age: 25 hours)
                      </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Weekly Backup Job</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Client Backup Weekly</p>
                        <p><span className="text-gray-500">Type:</span> backup</p>
                        <p><span className="text-gray-500">Job Type:</span> weekly</p>
                        <p><span className="text-gray-500">Check Command:</span> f0fdd531-926e-47e8-823d-0b6ff93bd566 weekly</p>
                      </div>
                      <p className="mt-1 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        Auto-detects max age based on job type (weekly: 192h)
                      </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded p-2">
                      <p className="font-medium text-gray-900 text-xs mb-1">Monthly Backup Job</p>
                      <div className="space-y-0.5 text-gray-700 font-mono text-xs">
                        <p><span className="text-gray-500">Name:</span> Client Backup Monthly</p>
                        <p><span className="text-gray-500">Type:</span> backup</p>
                        <p><span className="text-gray-500">Job Type:</span> monthly</p>
                        <p><span className="text-gray-500">Check Command:</span> c4ae9a05-3da3-49cf-a306-70ce782524af monthly 768</p>
                        <p><span className="text-gray-500">Disk Path:</span> /srv/dev-disk-by-uuid-xxx/backup</p>
                      </div>
                      <p className="mt-1 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        Monitors monthly backups (max age: 768 hours / 32 days)
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg p-3 shadow-sm">
                      <p className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                        <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">Setup</span>
                        How to Configure rsnapshot Monitoring
                      </p>
                      <div className="space-y-2">
                        <div className="bg-white border border-purple-200 rounded p-2">
                          <p className="font-medium text-gray-900 text-xs mb-1">Step 1: Find Job UUID</p>
                          <p className="text-xs text-gray-700 mb-1">
                            Check the rsnapshot config directory on your OpenMediaVault server:
                          </p>
                          <code className="block text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                            ls /var/lib/openmediavault/rsnapshot.d/
                          </code>
                          <p className="mt-1 text-xs text-gray-600">
                            Look for files like: rsnapshot-[UUID].conf
                          </p>
                        </div>

                        <div className="bg-white border border-purple-200 rounded p-2">
                          <p className="font-medium text-gray-900 text-xs mb-1">Step 2: Check Log Format</p>
                          <p className="text-xs text-gray-700 mb-1">
                            Verify your rsnapshot log shows entries like:
                          </p>
                          <code className="block text-xs bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                            [2026-01-01T01:55:09] /usr/bin/rsnapshot -c /var/lib/openmediavault/rsnapshot.d/rsnapshot-ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2.conf daily: completed successfully
                          </code>
                        </div>

                        <div className="bg-white border border-purple-200 rounded p-2">
                          <p className="font-medium text-gray-900 text-xs mb-1">Step 3: Configure Service</p>
                          <div className="space-y-0.5 text-xs text-gray-700">
                            <p><span className="font-medium">Check Command Format:</span></p>
                            <code className="block bg-gray-100 px-2 py-1 rounded my-1">
                              [UUID] [job_type] [max_age_hours]
                            </code>
                            <p className="mt-1"><span className="font-medium">Examples:</span></p>
                            <ul className="ml-3 space-y-0.5 list-disc">
                              <li>ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25</li>
                              <li>f0fdd531-926e-47e8-823d-0b6ff93bd566 weekly</li>
                              <li>c4ae9a05-3da3-49cf-a306-70ce782524af monthly 768</li>
                            </ul>
                          </div>
                        </div>

                        <div className="bg-pink-50 border border-pink-300 rounded p-2 mt-2">
                          <p className="font-semibold text-pink-900 text-xs mb-1">Job Type Max Ages:</p>
                          <ul className="text-xs text-gray-700 space-y-0.5 ml-3 list-disc">
                            <li><span className="font-medium">hourly:</span> 2 hours (default)</li>
                            <li><span className="font-medium">daily:</span> 25 hours (default)</li>
                            <li><span className="font-medium">weekly:</span> 192 hours / 8 days (default)</li>
                            <li><span className="font-medium">monthly:</span> 768 hours / 32 days (default)</li>
                            <li><span className="font-medium">yearly:</span> 8784 hours / 366 days (default)</li>
                          </ul>
                          <p className="mt-2 text-xs font-medium text-pink-800">
                            If max_age_hours is omitted, defaults are used based on job_type
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-blue-200 bg-white/50">
                <div className="text-xs text-gray-700 space-y-2">
                  <div>
                    <p className="font-semibold mb-1">Setup Required:</p>
                    <p className="mb-1">Install and run the appropriate agent on your server:</p>
                    <ul className="ml-4 space-y-0.5 list-disc">
                      <li><code className="bg-gray-100 px-1">monitor-agent.sh</code> - Linux/Unix (bash commands)</li>
                      <li><code className="bg-gray-100 px-1">monitor-agent.ps1</code> - Windows (PowerShell commands)</li>
                      <li><code className="bg-gray-100 px-1">monitor-agent-mikrotik.sh</code> - MikroTik RouterOS (via SSH)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Disk Monitoring:</p>
                    <ul className="ml-4 space-y-0.5 list-disc">
                      <li><span className="font-medium">Linux:</span> Use paths like <code className="bg-gray-100 px-1">/</code>, <code className="bg-gray-100 px-1">/var/lib/mysql</code>, <code className="bg-gray-100 px-1">/mnt/nas</code></li>
                      <li><span className="font-medium">Windows:</span> Use drive letters like <code className="bg-gray-100 px-1">C:\</code>, <code className="bg-gray-100 px-1">D:\</code>, or paths like <code className="bg-gray-100 px-1">C:\inetpub</code></li>
                      <li>Adding a disk path creates a separate monitoring endpoint with its own status and alerts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="apache2, samba, mysql, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="systemd">systemd (Linux)</option>
              <option value="docker">docker</option>
              <option value="windows">windows (PowerShell)</option>
              <option value="interface">interface (MikroTik)</option>
              <option value="service">service (MikroTik)</option>
              <option value="backup">backup (rsnapshot)</option>
              <option value="process">process</option>
              <option value="custom">custom</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Type is a label for organization. The check command determines how the service is monitored.
            </p>
          </div>

          {formData.type === 'backup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type
              </label>
              <select
                value={formData.job_type}
                onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select job type...</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Backup schedule type (used for determining max age thresholds)
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Command *
            </label>
            <input
              type="text"
              required
              value={formData.check_command}
              onChange={(e) => setFormData({ ...formData, check_command: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder={
                formData.type === 'backup'
                  ? 'ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25'
                  : 'systemctl is-active apache2'
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.type === 'backup'
                ? 'Format: [UUID] [job_type] [max_age_hours]. Example: ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25'
                : 'Command to check if the service is running'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check Interval (seconds)
            </label>
            <input
              type="number"
              min="60"
              max="3600"
              value={formData.check_interval}
              onChange={(e) => setFormData({ ...formData, check_interval: parseInt(e.target.value) || 300 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              How often to check this service (default: 300 seconds / 5 minutes)
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Individual Disk Space Monitoring
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Creates a separate monitoring endpoint for disk usage
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Optional:</span> Enable this to create an individual disk monitoring card with its own JSON query endpoint for Uptime Kuma. This allows you to monitor service status and disk space separately.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disk Path (Optional)
                </label>
                <input
                  type="text"
                  value={formData.disk_path}
                  onChange={(e) => setFormData({ ...formData, disk_path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder={formData.type === 'windows' ? 'C:\\, D:\\, or C:\\inetpub' : '/var/lib/mysql, /mnt/data, or /'}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.type === 'windows'
                    ? 'Leave empty to skip disk monitoring. Enter a Windows path (C:\\, D:\\SQLData, etc.) to create an individual disk monitor.'
                    : 'Leave empty to skip disk monitoring. Enter a Unix path (/var/lib/mysql, /mnt/data, etc.) to create an individual disk monitor.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Critical Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.disk_threshold}
                  onChange={(e) => setFormData({ ...formData, disk_threshold: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Status: OK (below {Math.round((formData.disk_threshold || 80) * 0.8)}%) | Warning ({Math.round((formData.disk_threshold || 80) * 0.8)}-{formData.disk_threshold}%) | Critical (above {formData.disk_threshold}%)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
