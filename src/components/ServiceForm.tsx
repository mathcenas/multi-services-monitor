import { useState, useEffect } from 'react';
import { Service } from '../types';
import { api } from '../api';
import { X, Info } from 'lucide-react';

interface ServiceFormProps {
  serverId: number;
  service: Service | null;
  onClose: () => void;
}

export function ServiceForm({ serverId, service, onClose }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'systemd',
    check_command: '',
    description: '',
    disk_path: '',
    disk_threshold: 80,
  });
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        type: service.type,
        check_command: service.check_command,
        description: service.description || '',
        disk_path: service.disk_path || '',
        disk_threshold: service.disk_threshold || 80,
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (service) {
        await api.updateService(service.id, formData);
      } else {
        await api.createService(serverId, formData);
      }
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
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm space-y-3">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Service Examples:</p>
              </div>

              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-blue-100">
                  <p className="font-medium text-gray-900 mb-1">Systemd Service</p>
                  <div className="space-y-1 text-gray-700 font-mono text-xs">
                    <p><span className="text-gray-500">Name:</span> apache2</p>
                    <p><span className="text-gray-500">Type:</span> systemd</p>
                    <p><span className="text-gray-500">Check Command:</span> systemctl is-active apache2</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-blue-100">
                  <p className="font-medium text-gray-900 mb-1">Docker Container</p>
                  <div className="space-y-1 text-gray-700 font-mono text-xs">
                    <p><span className="text-gray-500">Name:</span> nginx</p>
                    <p><span className="text-gray-500">Type:</span> docker</p>
                    <p><span className="text-gray-500">Check Command:</span> docker ps --filter name=nginx --filter status=running -q</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-blue-100">
                  <p className="font-medium text-gray-900 mb-1">Process Check</p>
                  <div className="space-y-1 text-gray-700 font-mono text-xs">
                    <p><span className="text-gray-500">Name:</span> mysql</p>
                    <p><span className="text-gray-500">Type:</span> process</p>
                    <p><span className="text-gray-500">Check Command:</span> pgrep mysqld</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-blue-100">
                  <p className="font-medium text-gray-900 mb-1">Custom URL Check</p>
                  <div className="space-y-1 text-gray-700 font-mono text-xs">
                    <p><span className="text-gray-500">Name:</span> API Health</p>
                    <p><span className="text-gray-500">Type:</span> custom</p>
                    <p><span className="text-gray-500">Check Command:</span> curl -s https://api.example.com/health | grep -q "ok"</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-blue-100">
                  <p className="font-medium text-gray-900 mb-1">File Server with Disk Monitoring</p>
                  <div className="space-y-1 text-gray-700 font-mono text-xs">
                    <p><span className="text-gray-500">Name:</span> NAS (File Server R:)</p>
                    <p><span className="text-gray-500">Type:</span> custom</p>
                    <p><span className="text-gray-500">Check Command:</span> systemctl is-active smbd</p>
                    <p><span className="text-gray-500">Disk Path:</span> /mnt/nas</p>
                    <p><span className="text-gray-500">Threshold:</span> 90%</p>
                  </div>
                  <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    This creates 2 individual monitors: one for service status, one for disk usage
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Note:</span> The check command runs on your server via the monitoring agent.
                  It should return a success exit code (0) when the service is up. Adding a disk path creates a separate monitoring endpoint.
                </p>
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
              <option value="systemd">systemd</option>
              <option value="docker">docker</option>
              <option value="process">process</option>
              <option value="custom">custom</option>
            </select>
          </div>

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
              placeholder="systemctl is-active apache2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Command to check if the service is running
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
                  placeholder="/var/lib/mysql, /mnt/data, or /"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to skip disk monitoring. Enter a path to create an individual disk monitor.
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
