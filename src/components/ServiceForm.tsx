import { useState, useEffect } from 'react';
import { Service } from '../types';
import { api } from '../api';
import { X } from 'lucide-react';

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
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        type: service.type,
        check_command: service.check_command,
        description: service.description || '',
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
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
