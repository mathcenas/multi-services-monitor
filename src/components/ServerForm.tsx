import { useState, useEffect } from 'react';
import { Server } from '../types';
import { X, Server as ServerIcon, Info, Users, Download, Upload, Copy, RotateCw, Check } from 'lucide-react';
import { rotateServerPushToken } from '../api';

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
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [showPushInfo, setShowPushInfo] = useState(false);
  const [pushToken, setPushToken] = useState<string | undefined>(server?.push_token);
  const [copied, setCopied] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

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

  const apiUrl = window.location.origin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleRotate = async () => {
    if (!server) return;
    if (!confirm('Rotate the push token? The current token will stop working immediately.')) return;
    setRotating(true);
    try {
      const updated = await rotateServerPushToken(server.id);
      setPushToken(updated.push_token);
    } catch (err) {
      alert('Failed to rotate token');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
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

          {server && pushToken && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
              <button
                type="button"
                onClick={() => setShowPushInfo(!showPushInfo)}
                className="flex items-center gap-2 text-emerald-700 font-medium hover:text-emerald-800 w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Upload size={18} />
                  <span>Push Mode Setup (Recommended)</span>
                </div>
                <Info size={16} />
              </button>

              {showPushInfo && (
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <p>
                    The server pushes its status to the dashboard using a secure token.
                    No inbound ports or JSON endpoints required on the client side.
                  </p>

                  <div className="bg-white border border-emerald-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Push Token</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pushToken, 'token')}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          {copied === 'token' ? <Check size={12} /> : <Copy size={12} />}
                          {copied === 'token' ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRotate}
                          disabled={rotating}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <RotateCw size={12} className={rotating ? 'animate-spin' : ''} />
                          Rotate
                        </button>
                      </div>
                    </div>
                    <code className="block text-xs bg-gray-900 text-emerald-300 px-2 py-2 rounded break-all font-mono">
                      {pushToken}
                    </code>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded p-3 space-y-2">
                    <p className="font-medium text-gray-900">Install on the server:</p>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre">
{`sudo curl -o /usr/local/bin/monitor-agent-push.sh \\
  ${apiUrl}/monitor-agent-push.sh
sudo chmod +x /usr/local/bin/monitor-agent-push.sh

export MONITOR_API_URL="${apiUrl}"
export PUSH_TOKEN="${pushToken}"
export SERVICES="nginx docker ssh"
export DISK_PATHS="/ /var"
export PUSH_INTERVAL=60

monitor-agent-push.sh`}
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded p-3">
                    <p className="font-medium text-gray-900 mb-2">Or call the endpoint directly (any language):</p>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre">
{`curl -X POST ${apiUrl}/api/push \\
  -H "Authorization: Bearer ${pushToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_type": "custom",
    "services": [
      {"name": "nginx", "status": "active", "version": "1.24.0"},
      {"name": "disk:/", "type": "disk", "status": "active",
       "disk_path": "/", "disk_usage": 42}
    ]
  }'`}
                    </div>
                  </div>

                  <a
                    href={`${apiUrl}/monitor-agent-push.sh`}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-full justify-center"
                  >
                    <Download size={16} />
                    Download Push Agent Script
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <button
              type="button"
              onClick={() => setShowConnectionInfo(!showConnectionInfo)}
              className="flex items-center gap-2 text-blue-700 font-medium hover:text-blue-800 w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>Connection Monitoring (Optional)</span>
              </div>
              <Info size={16} />
            </button>

            {showConnectionInfo && (
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <p className="font-medium">Track active network connections on this server (SMB, NFS, SSH, FTP)</p>

                <div className="bg-white border border-blue-200 rounded p-3 space-y-2">
                  <p className="font-medium text-gray-900">For OpenMediaVault/Debian/Ubuntu:</p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                    <div>sudo apt-get install -y jq curl</div>
                    <div className="mt-1">sudo curl -o /usr/local/bin/monitor-agent-omv-connections.sh \</div>
                    <div>  {apiUrl}/monitor-agent-omv-connections.sh</div>
                    <div className="mt-1">sudo chmod +x /usr/local/bin/monitor-agent-omv-connections.sh</div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2">
                    After download, configure the agent with your server details and set it up as a systemd service.
                    See the setup guide for complete instructions.
                  </p>
                </div>

                <a
                  href={`${apiUrl}/monitor-agent-omv-connections.sh`}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
                >
                  <Download size={16} />
                  Download Connection Monitor Script
                </a>

                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> The server name in this form must match the hostname of your server for connection tracking to work correctly.
                  </p>
                </div>
              </div>
            )}
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
