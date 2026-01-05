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
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
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
