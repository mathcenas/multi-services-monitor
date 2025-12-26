import { useState } from 'react';
import { Server } from './types';
import { ServerList } from './components/ServerList';
import { ServiceManager } from './components/ServiceManager';
import { Dashboard } from './components/Dashboard';
import { Activity, Settings, LayoutDashboard } from 'lucide-react';

type View = 'dashboard' | 'servers' | 'service-manager';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  const handleSelectServer = (server: Server) => {
    setSelectedServer(server);
    setCurrentView('service-manager');
  };

  const handleBackToServers = () => {
    setSelectedServer(null);
    setCurrentView('servers');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Activity size={24} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Service Monitor</h1>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCurrentView('dashboard');
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
                  setCurrentView('servers');
                  setSelectedServer(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'servers' || currentView === 'service-manager'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings size={20} />
                Manage Servers
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'servers' && <ServerList onSelectServer={handleSelectServer} />}
        {currentView === 'service-manager' && selectedServer && (
          <ServiceManager server={selectedServer} onBack={handleBackToServers} />
        )}
      </main>
    </div>
  );
}

export default App;
