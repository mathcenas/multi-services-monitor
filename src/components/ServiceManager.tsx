import { useState, useEffect } from 'react';
import { Server, Service } from '../types';
import { api } from '../api';
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, Code } from 'lucide-react';
import { ServiceForm } from './ServiceForm';

interface ServiceManagerProps {
  server: Server;
  onBack: () => void;
}

export function ServiceManager({ server, onBack }: ServiceManagerProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadServices();
  }, [server]);

  const loadServices = async () => {
    try {
      const data = await api.getServices(server.id);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await api.deleteService(id);
      loadServices();
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingService(null);
    loadServices();
  };

  const handleShowConfig = async () => {
    try {
      const configData = await api.getServerConfig(server.id);
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
                  {getStatusIcon(service.current_status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    {service.current_status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.current_status)}`}>
                        {service.current_status}
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
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    setEditingService(service);
                    setShowForm(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-1 hover:bg-gray-100 rounded"
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
