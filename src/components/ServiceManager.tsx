import { useState, useEffect } from 'react';
import { Server, Service } from '../types';
import { getServices, deleteService, getServerConfig } from '../api';
import { ArrowLeft, Plus, CreditCard as Edit2, Trash2, CheckCircle, XCircle, Clock, Code, Terminal, AlertTriangle, HardDrive, Info, Copy } from 'lucide-react';
import { ServiceForm } from './ServiceForm';

interface ServiceManagerProps {
  server: Server;
  onBack: () => void;
}

export function ServiceManager({ server, onBack }: ServiceManagerProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [showAgentSetup, setShowAgentSetup] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, [server]);

  const loadServices = async () => {
    try {
      const data = await getServices(server.id);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await deleteService(id);
      loadServices();
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingService(undefined);
    loadServices();
  };

  const handleShowConfig = async () => {
    try {
      const configData = await getServerConfig(server.id);
      setConfig(configData);
      setShowConfig(true);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return <Clock size={20} className="text-gray-400" />;
    if (status === 'up' || status === 'active') return <CheckCircle size={20} className="text-green-500" />;
    return <XCircle size={20} className="text-red-500" />;
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    if (status === 'up' || status === 'active') return 'bg-green-100 text-green-700';
    return 'bg-red-100 text-red-700';
  };

  const extractVersion = (versionString: string): string => {
    const match = versionString.match(/^(\d+\.?\d*\.?\d*)/);
    return match ? match[1] : versionString;
  };

  const compareVersions = (current: string, latest: string): number => {
    const cleanCurrent = extractVersion(current);
    const cleanLatest = extractVersion(latest);

    const currentParts = cleanCurrent.split('.').map(Number);
    const latestParts = cleanLatest.split('.').map(Number);

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (loading) {
    return <div className="text-center py-8">Loading services...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{server.name}</h2>
          <p className="text-sm text-gray-500">{server.hostname}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Services</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAgentSetup(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Terminal size={20} />
            Agent Setup
          </button>
          <button
            onClick={handleShowConfig}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Code size={20} />
            View JSON Config
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Service
          </button>
        </div>
      </div>

      {showForm && (
        <ServiceForm
          serverId={server.id}
          service={editingService}
          onClose={handleFormClose}
        />
      )}

{showAgentSetup && (() => {
        const hasWindowsServices = services.some(s => s.type === 'windows');
        const hasBackupServices = services.some(s => s.type === 'backup');
        const hasMikroTikServices = services.some(s => s.type === 'interface' || s.type === 'service');
        const [selectedPlatform, setSelectedPlatform] = useState<'linux' | 'windows' | 'mikrotik' | 'rsnapshot'>(
          hasBackupServices ? 'rsnapshot' : hasWindowsServices ? 'windows' : hasMikroTikServices ? 'mikrotik' : 'linux'
        );

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-auto">
              <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Monitoring Agent Setup</h3>
                <button
                  onClick={() => setShowAgentSetup(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Select Platform</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setSelectedPlatform('linux')}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedPlatform === 'linux'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold">Linux/Unix</div>
                      <div className="text-xs mt-1">Bash Script</div>
                    </button>
                    <button
                      onClick={() => setSelectedPlatform('windows')}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedPlatform === 'windows'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold">Windows</div>
                      <div className="text-xs mt-1">PowerShell</div>
                    </button>
                    <button
                      onClick={() => setSelectedPlatform('mikrotik')}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedPlatform === 'mikrotik'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold">MikroTik</div>
                      <div className="text-xs mt-1">RouterOS</div>
                    </button>
                    <button
                      onClick={() => setSelectedPlatform('rsnapshot')}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedPlatform === 'rsnapshot'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold">rsnapshot</div>
                      <div className="text-xs mt-1">OMV Backups</div>
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Server Information</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Server ID:</span>
                      <code className="font-mono font-bold text-blue-600">{server.id}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Server Name:</span>
                      <code className="font-mono text-gray-900">{server.name}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Selected Platform:</span>
                      <code className="font-mono text-gray-900">{selectedPlatform}</code>
                    </div>
                  </div>
                </div>

                {selectedPlatform === 'windows' ? (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Prerequisites (Required!)</h4>
                      <p className="text-sm text-red-800 mb-3">
                        Windows PowerShell 5.1 or later is required (included in Windows Server 2016+)
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1. Download the monitoring script</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Open PowerShell as Administrator and download the monitor-agent.ps1 script:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`Invoke-WebRequest -Uri "${window.location.origin}/monitor-agent.ps1" -OutFile "C:\\monitor-agent.ps1"`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2. Configure environment variables</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Set these environment variables in PowerShell:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`$env:MONITOR_API_URL = "${window.location.origin}"
$env:SERVER_ID = "${server.id}"
$env:CHECK_INTERVAL = "60"  # Check every 60 seconds`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3. Run the agent</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Run the monitoring agent:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`C:\\monitor-agent.ps1`}
                      </pre>
                      <p className="text-sm text-gray-600 mt-3">
                        Or run as a Windows Service (recommended for production):
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm mt-2">
{`# Install NSSM (Non-Sucking Service Manager)
# Download from https://nssm.cc/download

# Install the service
nssm install MonitorAgent "powershell.exe" "-ExecutionPolicy Bypass -File C:\\monitor-agent.ps1"
nssm set MonitorAgent AppEnvironmentExtra MONITOR_API_URL=${window.location.origin} SERVER_ID=${server.id} CHECK_INTERVAL=60
nssm set MonitorAgent DisplayName "Server Monitoring Agent"
nssm set MonitorAgent Description "Monitors server services and disk usage"
nssm set MonitorAgent Start SERVICE_AUTO_START

# Start the service
nssm start MonitorAgent`}
                      </pre>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">Important Notes</h4>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>Make sure this monitoring server ({window.location.origin}) is accessible from your Windows server (check firewall rules)</li>
                        <li>The agent will continuously check services every 60 seconds by default</li>
                        <li>Run PowerShell as Administrator for service checks</li>
                        <li>You may need to set execution policy: Set-ExecutionPolicy RemoteSigned</li>
                      </ul>
                    </div>
                  </>
                ) : selectedPlatform === 'linux' ? (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Prerequisites (Required!)</h4>
                      <p className="text-sm text-red-800 mb-3">
                        Before running the agent, install these required tools:
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-red-900 mb-1">Ubuntu/Debian:</p>
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
{`sudo apt-get update && sudo apt-get install -y curl jq`}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-900 mb-1">CentOS/RHEL/Rocky:</p>
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
{`sudo yum install -y curl jq`}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-900 mb-1">Alpine:</p>
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
{`apk add curl jq bash`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1. Download the monitoring script</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Download the monitor-agent.sh script to your server:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`curl -O ${window.location.origin}/monitor-agent.sh
chmod +x monitor-agent.sh`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2. Configure environment variables</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Set these environment variables:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`export MONITOR_API_URL=${window.location.origin}
export SERVER_ID=${server.id}
export CHECK_INTERVAL=60  # Check every 60 seconds`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3. Run the agent</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Run the monitoring agent:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`./monitor-agent.sh`}
                      </pre>
                      <p className="text-sm text-gray-600 mt-3">
                        Or run as a systemd service (recommended for production):
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm mt-2">
{`sudo tee /etc/systemd/system/monitor-agent.service > /dev/null <<EOF
[Unit]
Description=Server Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
Environment="MONITOR_API_URL=${window.location.origin}"
Environment="SERVER_ID=${server.id}"
Environment="CHECK_INTERVAL=60"
ExecStart=/path/to/monitor-agent.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable monitor-agent
sudo systemctl start monitor-agent`}
                      </pre>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">Important Notes</h4>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>Make sure this monitoring server ({window.location.origin}) is accessible from your target server (check firewall rules)</li>
                        <li>The agent will continuously check services every 60 seconds by default</li>
                        <li>Run the agent as root or with sufficient permissions to check system services</li>
                      </ul>
                    </div>
                  </>
                ) : selectedPlatform === 'mikrotik' ? (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Prerequisites (Required!)</h4>
                      <p className="text-sm text-red-800 mb-3">
                        SSH access to your MikroTik router with public key authentication configured
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1. Set up SSH key authentication</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Generate an SSH key pair on your monitoring server:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`ssh-keygen -t rsa -b 2048 -f ~/.ssh/mikrotik_monitor
# Upload public key to MikroTik RouterOS`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2. Download and configure the agent</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Download the MikroTik monitoring script:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`curl -O ${window.location.origin}/monitor-agent-mikrotik.sh
chmod +x monitor-agent-mikrotik.sh`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3. Set environment variables</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`export MONITOR_API_URL=${window.location.origin}
export SERVER_ID=${server.id}
export SERVER_NAME="${server.name}"
export MIKROTIK_HOST="192.168.88.1"  # Your MikroTik IP
export MIKROTIK_USER="admin"
export MIKROTIK_KEY="~/.ssh/mikrotik_monitor"
export CHECK_INTERVAL=60`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">4. Run the agent</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`./monitor-agent-mikrotik.sh`}
                      </pre>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">What gets monitored</h4>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>CPU and RAM usage (automatic)</li>
                        <li>System uptime (automatic)</li>
                        <li>RouterOS version (automatic)</li>
                        <li>Network interfaces (add as services)</li>
                        <li>IP services like SSH, API (add as services)</li>
                      </ul>
                    </div>
                  </>
                ) : selectedPlatform === 'rsnapshot' ? (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Prerequisites (Required!)</h4>
                      <p className="text-sm text-red-800 mb-3">
                        OpenMediaVault server with rsnapshot plugin installed and configured
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1. Find rsnapshot job UUIDs</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        On your OpenMediaVault server, find the job UUIDs:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`ls /var/lib/openmediavault/rsnapshot.d/
# Look for: rsnapshot-[UUID].conf`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2. Download the monitoring agent</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Download the rsnapshot monitor agent:
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`curl -O ${window.location.origin}/monitor-agent-rsnapshot.sh
chmod +x monitor-agent-rsnapshot.sh`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3. Configure environment variables</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`export MONITOR_API_URL=${window.location.origin}
export SERVER_ID=${server.id}
export CHECK_INTERVAL=300
export RSNAPSHOT_LOG="/var/log/rsnapshot.log"`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">4. Add backup jobs as services</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        For each rsnapshot job, add a service with:
                      </p>
                      <div className="bg-white border border-purple-200 rounded-lg p-4 space-y-2 text-sm">
                        <div><span className="font-semibold">Type:</span> backup</div>
                        <div><span className="font-semibold">Job Type:</span> daily, weekly, monthly, etc.</div>
                        <div><span className="font-semibold">Check Command:</span> [UUID] [job_type] [max_age_hours]</div>
                        <div className="mt-2 text-xs text-gray-600">
                          Example: <code className="bg-gray-100 px-2 py-1 rounded">ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25</code>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">5. Run the agent</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`./monitor-agent-rsnapshot.sh`}
                      </pre>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">Default Max Ages</h4>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>Hourly: 2 hours</li>
                        <li>Daily: 25 hours</li>
                        <li>Weekly: 192 hours (8 days)</li>
                        <li>Monthly: 768 hours (32 days)</li>
                        <li>Yearly: 8784 hours (366 days)</li>
                      </ul>
                      <p className="mt-2 text-xs text-yellow-800">
                        See <a href="/RSNAPSHOT-MONITOR-SETUP.md" className="underline" target="_blank">RSNAPSHOT-MONITOR-SETUP.md</a> for detailed setup instructions
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {showConfig && config && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">JSON Configuration</h3>
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Use this endpoint in your monitoring scripts:
                <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
                  GET /api/servers/{server.id}/services.json
                </code>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Full URL:
                <code className="block mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                  {window.location.origin}/api/servers/{server.id}/services.json
                </code>
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1">
                  {getStatusIcon(service.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    {service.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    )}
                    {service.current_version && (
                      <>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          v{extractVersion(service.current_version)}
                        </span>
                        {service.current_version.includes('updates available') && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            {service.current_version.match(/\((\d+ updates available)\)/)?.[1]}
                          </span>
                        )}
                      </>
                    )}
                    {service.latest_version && needsUpdate(service) && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <AlertTriangle size={12} />
                        v{service.latest_version} available
                      </span>
                    )}
                    {service.latest_version && !needsUpdate(service) && service.current_version && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Up to date
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 text-gray-900">{service.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Check Command:</span>
                      <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {service.check_command}
                      </code>
                    </div>
                    {service.description && (
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <span className="ml-2 text-gray-900">{service.description}</span>
                      </div>
                    )}
                    {service.last_checked && (
                      <div>
                        <span className="text-gray-500">Last Checked:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(service.last_checked).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {service.current_message && (
                      <div>
                        <span className="text-gray-500">Message:</span>
                        <span className="ml-2 text-gray-900">{service.current_message}</span>
                      </div>
                    )}
                    {service.disk_path && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <HardDrive size={16} className="text-gray-500" />
                          <span className="text-gray-500 font-medium">Disk Space:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">
                            {service.disk_path}
                          </code>
                        </div>
                        {service.disk_usage !== undefined && service.disk_usage !== null ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className={`font-medium ${
                                    service.disk_usage >= (service.disk_threshold || 80)
                                      ? 'text-red-600'
                                      : service.disk_usage >= (service.disk_threshold || 80) * 0.8
                                      ? 'text-yellow-600'
                                      : 'text-green-600'
                                  }`}>
                                    {service.disk_usage}% used
                                  </span>
                                  <span className="text-gray-500">
                                    Threshold: {service.disk_threshold || 80}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      service.disk_usage >= (service.disk_threshold || 80)
                                        ? 'bg-red-500'
                                        : service.disk_usage >= (service.disk_threshold || 80) * 0.8
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(service.disk_usage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            {service.disk_used && service.disk_available && service.disk_total && (
                              <div className="text-xs text-gray-600">
                                Used: {service.disk_used} / Available: {service.disk_available} / Total: {service.disk_total}
                              </div>
                            )}
                            {service.disk_usage >= (service.disk_threshold || 80) && (
                              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                <AlertTriangle size={14} />
                                Disk usage exceeds threshold!
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            Waiting for disk data...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {expandedHelp === service.id && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Info size={16} className="text-blue-600" />
                        Uptime Kuma Integration
                      </h5>

                      <div className="space-y-6 text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle size={16} className="text-green-600" />
                            <p className="text-gray-700 font-semibold">Service Status Monitor</p>
                          </div>
                          <p className="text-gray-600 text-xs mb-2">Monitor if this service is running:</p>
                          <div className="bg-white p-3 rounded border border-blue-100 space-y-2">
                            <div>
                              <span className="text-gray-500 text-xs">Monitor Type:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">JSON Query</code>
                                <button
                                  onClick={() => copyToClipboard('JSON Query', `type-service-${service.id}`)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Copy"
                                >
                                  {copiedText === `type-service-${service.id}` ? (
                                    <span className="text-xs text-green-600">Copied!</span>
                                  ) : (
                                    <Copy size={14} className="text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">URL:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1 break-all">
                                  {window.location.origin}/api/health/service/{service.id}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}/api/health/service/${service.id}`, `url-service-${service.id}`)}
                                  className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                                  title="Copy URL"
                                >
                                  {copiedText === `url-service-${service.id}` ? (
                                    <span className="text-xs text-green-600">Copied!</span>
                                  ) : (
                                    <Copy size={14} className="text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">JSON Query:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">$.status</code>
                                <button
                                  onClick={() => copyToClipboard('$.status', `query-service-${service.id}`)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Copy JSON Query"
                                >
                                  {copiedText === `query-service-${service.id}` ? (
                                    <span className="text-xs text-green-600">Copied!</span>
                                  ) : (
                                    <Copy size={14} className="text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Expected Value:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">up</code>
                                <button
                                  onClick={() => copyToClipboard('up', `expected-service-${service.id}`)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Copy Expected Value"
                                >
                                  {copiedText === `expected-service-${service.id}` ? (
                                    <span className="text-xs text-green-600">Copied!</span>
                                  ) : (
                                    <Copy size={14} className="text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">View API Response Example</summary>
                            <pre className="bg-white p-3 rounded border border-blue-100 text-xs overflow-auto mt-2">
{`{
  "status": "up",
  "service": "${service.name}",
  "server": "${server.name}",
  "hostname": "${server.hostname}",
  "message": "${service.current_message || 'Service is running'}",
  "last_checked": "${service.last_checked || new Date().toISOString()}"
}`}
                            </pre>
                          </details>
                        </div>

                        {service.disk_path && (
                          <div className="border-t border-blue-200 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <HardDrive size={16} className="text-orange-600" />
                              <p className="text-gray-700 font-semibold">Disk Usage Monitor</p>
                            </div>
                            <p className="text-gray-600 text-xs mb-2">Monitor disk space for: {service.disk_path}</p>
                            <div className="bg-white p-3 rounded border border-blue-100 space-y-2">
                              <div>
                                <span className="text-gray-500 text-xs">Monitor Type:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">JSON Query</code>
                                  <button
                                    onClick={() => copyToClipboard('JSON Query', `type-disk-${service.id}`)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="Copy"
                                  >
                                    {copiedText === `type-disk-${service.id}` ? (
                                      <span className="text-xs text-green-600">Copied!</span>
                                    ) : (
                                      <Copy size={14} className="text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">URL:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1 break-all">
                                    {window.location.origin}/api/health/disk/{service.id}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/api/health/disk/${service.id}`, `url-disk-${service.id}`)}
                                    className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                                    title="Copy URL"
                                  >
                                    {copiedText === `url-disk-${service.id}` ? (
                                      <span className="text-xs text-green-600">Copied!</span>
                                    ) : (
                                      <Copy size={14} className="text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">JSON Query:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">$.status</code>
                                  <button
                                    onClick={() => copyToClipboard('$.status', `query-disk-${service.id}`)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="Copy JSON Query"
                                  >
                                    {copiedText === `query-disk-${service.id}` ? (
                                      <span className="text-xs text-green-600">Copied!</span>
                                    ) : (
                                      <Copy size={14} className="text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">Expected Value:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">ok</code>
                                  <button
                                    onClick={() => copyToClipboard('ok', `expected-disk-${service.id}`)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="Copy Expected Value"
                                  >
                                    {copiedText === `expected-disk-${service.id}` ? (
                                      <span className="text-xs text-green-600">Copied!</span>
                                    ) : (
                                      <Copy size={14} className="text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                              <p className="text-orange-800">
                                <span className="font-semibold">Status Values:</span> ok (under {(service.disk_threshold || 80) * 0.8}%) | warning ({(service.disk_threshold || 80) * 0.8}-{service.disk_threshold || 80}%) | critical (over {service.disk_threshold || 80}%)
                              </p>
                            </div>
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">View API Response Example</summary>
                              <pre className="bg-white p-3 rounded border border-blue-100 text-xs overflow-auto mt-2">
{`{
  "status": "ok",
  "service": "${service.name}",
  "server": "${server.name}",
  "hostname": "${server.hostname}",
  "disk_path": "${service.disk_path}",
  "disk_usage": ${service.disk_usage || 45},
  "disk_total": "${service.disk_total || '100G'}",
  "disk_used": "${service.disk_used || '45G'}",
  "disk_available": "${service.disk_available || '55G'}",
  "disk_threshold": ${service.disk_threshold || 80},
  "message": "Disk usage at ${service.disk_usage || 45}% (threshold: ${service.disk_threshold || 80}%)",
  "last_checked": "${service.last_checked || new Date().toISOString()}"
}`}
                              </pre>
                            </details>
                          </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-xs text-yellow-800">
                            <span className="font-semibold">Note:</span> Make sure the monitoring agent is running on your server to get live status updates.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => setExpandedHelp(expandedHelp === service.id ? null : service.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Uptime Kuma Integration"
                >
                  <Info size={16} className={expandedHelp === service.id ? "text-blue-600" : "text-gray-600"} />
                </button>
                <button
                  onClick={() => {
                    setEditingService(service);
                    setShowForm(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Edit Service"
                >
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Delete Service"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No services configured yet. Add your first service to monitor.
        </div>
      )}
    </div>
  );
}
