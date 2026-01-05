import { useState, useEffect } from 'react';
import { Server } from '../types';
import { X, Server as ServerIcon } from 'lucide-react';

interface ServerFormProps {
  server?: Server;
  onSubmit: (data: Partial<Server>) => Promise<void>;
  onClose: () => void;
}

export function ServerForm({ server, onSubmit, onClose }: ServerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    os: '',
    os_version: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        os: server.os || '',
        os_version: server.os_version || '',
        notes: server.notes || '',
      });
    }
  }, [server]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save server:', error);
      alert('Failed to save server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ServerIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              {server ? 'Edit Server' : 'Add Server'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="web-server-01 or COMPUTERNAME"
            />
            <p className="mt-1 text-xs text-gray-500">
              This should match the server's computer name for monitoring agents
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operating System
            </label>
            <input
              type="text"
              value={formData.os}
              onChange={(e) => setFormData({ ...formData, os: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Windows Server, Ubuntu, CentOS, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OS Version
            </label>
            <input
              type="text"
              value={formData.os_version}
              onChange={(e) => setFormData({ ...formData, os_version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2022, 22.04, 7.9, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Internal notes about this server..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
              {saving ? 'Saving...' : server ? 'Update' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
