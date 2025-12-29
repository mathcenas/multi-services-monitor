interface LatestVersions {
  [key: string]: string;
}

const versionCache: { data: LatestVersions; timestamp: number } = {
  data: {},
  timestamp: 0
};

const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function fetchLatestVersions(): Promise<LatestVersions> {
  const now = Date.now();

  if (versionCache.timestamp && now - versionCache.timestamp < CACHE_DURATION) {
    return versionCache.data;
  }

  const versions: LatestVersions = {};

  try {
    // Docker
    const dockerResponse = await fetch('https://api.github.com/repos/moby/moby/releases/latest');
    if (dockerResponse.ok) {
      const dockerData = await dockerResponse.json();
      versions.docker = dockerData.tag_name.replace('v', '');
    }
  } catch (error) {
    console.error('Failed to fetch Docker version:', error);
  }

  try {
    // Nginx
    const nginxResponse = await fetch('https://nginx.org/en/download.html');
    if (nginxResponse.ok) {
      const nginxHtml = await nginxResponse.text();
      const match = nginxHtml.match(/nginx-(\d+\.\d+\.\d+)\.tar\.gz/);
      if (match) {
        versions.nginx = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch Nginx version:', error);
  }

  try {
    // Node.js
    const nodeResponse = await fetch('https://nodejs.org/dist/index.json');
    if (nodeResponse.ok) {
      const nodeData = await nodeResponse.json();
      if (nodeData.length > 0) {
        versions.node = nodeData[0].version.replace('v', '');
        versions.nodejs = versions.node;
      }
    }
  } catch (error) {
    console.error('Failed to fetch Node.js version:', error);
  }

  try {
    // Python
    const pythonResponse = await fetch('https://www.python.org/downloads/');
    if (pythonResponse.ok) {
      const pythonHtml = await pythonResponse.text();
      const match = pythonHtml.match(/Download Python (\d+\.\d+\.\d+)/);
      if (match) {
        versions.python = match[1];
        versions.python3 = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch Python version:', error);
  }

  try {
    // PostgreSQL
    const pgResponse = await fetch('https://www.postgresql.org/versions.json');
    if (pgResponse.ok) {
      const pgData = await pgResponse.json();
      if (pgData.length > 0) {
        versions.postgresql = pgData[0].version;
        versions.postgres = pgData[0].version;
      }
    }
  } catch (error) {
    console.error('Failed to fetch PostgreSQL version:', error);
  }

  try {
    // Redis (from GitHub)
    const redisResponse = await fetch('https://api.github.com/repos/redis/redis/releases/latest');
    if (redisResponse.ok) {
      const redisData = await redisResponse.json();
      versions.redis = redisData.tag_name.replace(/^v?/, '');
      versions['redis-server'] = versions.redis;
    }
  } catch (error) {
    console.error('Failed to fetch Redis version:', error);
  }

  try {
    // MySQL
    const mysqlResponse = await fetch('https://dev.mysql.com/downloads/mysql/');
    if (mysqlResponse.ok) {
      const mysqlHtml = await mysqlResponse.text();
      const match = mysqlHtml.match(/MySQL Community Server (\d+\.\d+\.\d+)/);
      if (match) {
        versions.mysql = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch MySQL version:', error);
  }

  try {
    // WildFly (open source JBoss)
    const wildflyResponse = await fetch('https://api.github.com/repos/wildfly/wildfly/releases/latest');
    if (wildflyResponse.ok) {
      const wildflyData = await wildflyResponse.json();
      const version = wildflyData.tag_name.replace(/^v?/, '');
      versions.wildfly = version;
      versions.jboss = version;
      versions['jboss-eap'] = version;
    }
  } catch (error) {
    console.error('Failed to fetch WildFly/JBoss version:', error);
  }

  try {
    // Ubuntu LTS
    const ubuntuResponse = await fetch('https://api.launchpad.net/devel/ubuntu/series');
    if (ubuntuResponse.ok) {
      const ubuntuData = await ubuntuResponse.json();
      const ltsVersions = ubuntuData.entries
        .filter((entry: any) => entry.supported && entry.name)
        .sort((a: any, b: any) => b.version.localeCompare(a.version));
      if (ltsVersions.length > 0) {
        versions.ubuntu = ltsVersions[0].version;
      }
    }
  } catch (error) {
    console.error('Failed to fetch Ubuntu version:', error);
  }

  try {
    // Debian
    const debianResponse = await fetch('https://www.debian.org/releases/stable/');
    if (debianResponse.ok) {
      const debianHtml = await debianResponse.text();
      const match = debianHtml.match(/Debian (\d+)/i);
      if (match) {
        versions.debian = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch Debian version:', error);
  }

  try {
    // CentOS Stream / RHEL
    const centosResponse = await fetch('https://www.centos.org/download/');
    if (centosResponse.ok) {
      const centosHtml = await centosResponse.text();
      const match = centosHtml.match(/CentOS Stream (\d+)/);
      if (match) {
        versions.centos = match[1];
        versions.rhel = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch CentOS version:', error);
  }

  try {
    // Alpine Linux
    const alpineResponse = await fetch('https://alpinelinux.org/downloads/');
    if (alpineResponse.ok) {
      const alpineHtml = await alpineResponse.text();
      const match = alpineHtml.match(/alpine-standard-(\d+\.\d+\.\d+)/);
      if (match) {
        versions.alpine = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch Alpine version:', error);
  }

  try {
    // Fedora
    const fedoraResponse = await fetch('https://fedoraproject.org/');
    if (fedoraResponse.ok) {
      const fedoraHtml = await fedoraResponse.text();
      const match = fedoraHtml.match(/Fedora (\d+)/);
      if (match) {
        versions.fedora = match[1];
      }
    }
  } catch (error) {
    console.error('Failed to fetch Fedora version:', error);
  }

  // Add aliases for OS
  versions.os = versions.ubuntu || versions.debian || versions.centos || versions.alpine || versions.fedora || '';
  versions['operating-system'] = versions.os;
  versions.system = versions.os;

  versionCache.data = versions;
  versionCache.timestamp = now;

  return versions;
}

export async function getLatestVersion(serviceName: string): Promise<string | null> {
  const versions = await fetchLatestVersions();
  return versions[serviceName.toLowerCase()] || null;
}

export async function getAllLatestVersions(): Promise<LatestVersions> {
  return await fetchLatestVersions();
}
