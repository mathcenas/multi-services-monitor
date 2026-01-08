export function getRelativeTime(date: string | Date): string {
  const now = new Date().getTime();
  const then = new Date(date).getTime();
  const diffInSeconds = Math.floor((now - then) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return '1 day ago';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) {
    return '1 week ago';
  }
  if (diffInWeeks < 4) {
    return `${diffInWeeks} weeks ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) {
    return '1 month ago';
  }
  return `${diffInMonths} months ago`;
}

export function groupServicesByType<T extends { type?: string }>(services: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  services.forEach(service => {
    const type = service.type || 'Other';
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(service);
  });

  return groups;
}

export function isBackupService(name?: string): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return lowerName.includes('backup') || lowerName.includes('veeam');
}

export type BackupStatus = 'fresh' | 'aging' | 'stale' | 'critical' | 'unknown';

export function getBackupAgeStatus(lastCheck?: string | Date | null): BackupStatus {
  if (!lastCheck) return 'unknown';

  const now = new Date().getTime();
  const then = new Date(lastCheck).getTime();
  const diffInHours = (now - then) / (1000 * 60 * 60);

  if (diffInHours < 24) return 'fresh';
  if (diffInHours < 48) return 'aging';
  if (diffInHours < 72) return 'stale';
  return 'critical';
}

export function getBackupStatusColors(status: BackupStatus): {
  bg: string;
  border: string;
  text: string;
  badge: string;
  icon: string;
} {
  switch (status) {
    case 'fresh':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
        icon: 'text-green-600'
      };
    case 'aging':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-700',
        icon: 'text-yellow-600'
      };
    case 'stale':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-700',
        icon: 'text-orange-600'
      };
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        icon: 'text-red-600'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-700',
        icon: 'text-gray-600'
      };
  }
}

export function getBackupStatusLabel(status: BackupStatus): string {
  switch (status) {
    case 'fresh':
      return 'Recent';
    case 'aging':
      return 'Aging (24-48h)';
    case 'stale':
      return 'Stale (48-72h)';
    case 'critical':
      return 'Critical (>72h)';
    default:
      return 'Unknown';
  }
}

const LATEST_AGENT_VERSIONS: Record<string, string> = {
  'monitor-agent.sh': '1.2.0',
  'monitor-agent.ps1': '1.1.0',
  'monitor-agent-mikrotik.sh': '1.1.0',
  'monitor-agent-rsnapshot.sh': '1.2.0'
};

export function isAgentOutdated(agentType?: string, agentVersion?: string): boolean {
  if (!agentType || !agentVersion) return false;

  const latestVersion = LATEST_AGENT_VERSIONS[agentType];
  if (!latestVersion) return false;

  return agentVersion !== latestVersion;
}

export function getLatestAgentVersion(agentType?: string): string | null {
  if (!agentType) return null;
  return LATEST_AGENT_VERSIONS[agentType] || null;
}

export function getAgentDisplayName(agentType?: string): string {
  if (!agentType) return 'Unknown';

  switch (agentType) {
    case 'monitor-agent.sh':
      return 'Linux Agent';
    case 'monitor-agent.ps1':
      return 'Windows Agent';
    case 'monitor-agent-mikrotik.sh':
      return 'MikroTik Agent';
    case 'monitor-agent-rsnapshot.sh':
      return 'Rsnapshot Agent';
    default:
      return agentType;
  }
}
