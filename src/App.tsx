import { useState } from 'react';
import { Client, Server } from './types';
import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { ClientDetail } from './components/ClientDetail';
import { ClientForm } from './components/ClientForm';
import { ClientPortal } from './components/ClientPortal';
import { ITServiceForm } from './components/ITServiceForm';
import { ServiceManager } from './components/ServiceManager';
import { ServerForm } from './components/ServerForm';
import { Activity, Building2, LayoutDashboard, Users } from 'lucide-react';
import { createClient, updateClient, createServer, updateServer, createITService, updateITService, getServer } from './api';

type View = 'dashboard' | 'clients' | 'client-detail' | 'client-portal' | 'service-manager';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showServerForm, setShowServerForm] = useState(false);
  const [showITServiceForm, setShowITServiceForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [serverClientId, setServerClientId] = useState<string | null>(null);
  const [itServiceClientId, setITServiceClientId] = useState<string | null>(null);

  const isPortalView = currentView === 'client-portal';

  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setCurrentView('client-detail');
  };

  const handleAddClient = () => {
    setEditingClient(undefined);
    setShowClientForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleSaveClient = async (data: Partial<Client>) => {
    if (editingClient) {
      await updateClient(editingClient.id, data);
    } else {
      await createClient(data);
    }
    setShowClientForm(false);
    setEditingClient(undefined);
    if (selectedClientId) {
      setSelectedClientId(null);
      setTimeout(() => setSelectedClientId(selectedClientId), 100);
    }
  };

  const handleBackToClients = () => {
    setSelectedClientId(null);
    setCurrentView('clients');
  };

  const handleAddServer = (clientId: string) => {
    setServerClientId(clientId);
    setShowServerForm(true);
  };

  const handleAddITService = (clientId: string) => {
    setITServiceClientId(clientId);
    setShowITServiceForm(true);
  };

  const handleSaveServer = async (data: Partial<Server>) => {
    if (serverClientId) {
      await createServer({ ...data, client_id: serverClientId });
    } else {
      await createServer(data);
    }
    setShowServerForm(false);
    setServerClientId(null);
    if (selectedClientId) {
      setSelectedClientId(null);
      setTimeout(() => setSelectedClientId(selectedClientId), 100);
    }
  };

  const handleSaveITService = async (data: Partial<any>) => {
    await createITService(data);
    setShowITServiceForm(false);
    setITServiceClientId(null);
    if (selectedClientId) {
      setSelectedClientId(null);
      setTimeout(() => setSelectedClientId(selectedClientId), 100);
    }
  };

  const handleSelectServer = async (serverId: string) => {
    const server = await getServer(serverId);
    setSelectedServer(server);
    setSelectedServerId(serverId);
    setCurrentView('service-manager');
  };

  const handleBackFromServiceManager = () => {
    setSelectedServer(null);
    setSelectedServerId(null);
    if (selectedClientId) {
      setCurrentView('client-detail');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleViewPortal = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('client-portal');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPortalView && (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Activity size={24} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">IT Services Portal</h1>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setSelectedClientId(null);
                    setSelectedServer(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard size={20} />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setCurrentView('clients');
                    setSelectedClientId(null);
                    setSelectedServer(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'clients' || currentView === 'client-detail'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Building2 size={20} />
                  Clients
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={isPortalView ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'clients' && (
          <ClientList onSelectClient={handleSelectClient} onAddClient={handleAddClient} />
        )}
        {currentView === 'client-detail' && selectedClientId && (
          <ClientDetail
            clientId={selectedClientId}
            onBack={handleBackToClients}
            onEdit={handleEditClient}
            onAddServer={handleAddServer}
            onAddITService={handleAddITService}
            onSelectServer={handleSelectServer}
            onViewPortal={handleViewPortal}
          />
        )}
        {currentView === 'client-portal' && selectedClientId && (
          <ClientPortal clientId={selectedClientId} />
        )}
        {currentView === 'service-manager' && selectedServer && (
          <ServiceManager server={selectedServer} onBack={handleBackFromServiceManager} />
        )}
      </main>

      {showClientForm && (
        <ClientForm
          client={editingClient}
          onSubmit={handleSaveClient}
          onClose={() => {
            setShowClientForm(false);
            setEditingClient(undefined);
          }}
        />
      )}

      {showServerForm && (
        <ServerForm
          onSubmit={handleSaveServer}
          onClose={() => {
            setShowServerForm(false);
            setServerClientId(null);
          }}
        />
      )}

      {showITServiceForm && itServiceClientId && (
        <ITServiceForm
          clientId={itServiceClientId}
          onSubmit={handleSaveITService}
          onClose={() => {
            setShowITServiceForm(false);
            setITServiceClientId(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
