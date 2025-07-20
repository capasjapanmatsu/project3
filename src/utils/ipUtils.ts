// IP address detection utility
export interface IPInfo {
  ip: string;
  error?: string;
}

// Get client IP address using multiple methods
export const getClientIP = async (): Promise<IPInfo> => {
  try {
    // Method 1: Use ipify API (most reliable)
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      if (data.ip) {
        return { ip: data.ip };
      }
    } catch (error) {
      console.warn('Failed to get IP from ipify:', error);
    }

    // Method 2: Use ipapi.co as fallback
    try {
      const response = await fetch('https://ipapi.co/ip/');
      const ip = await response.text();
      if (ip && ip.trim()) {
        return { ip: ip.trim() };
      }
    } catch (error) {
      console.warn('Failed to get IP from ipapi.co:', error);
    }

    // Method 3: Use httpbin.org as fallback
    try {
      const response = await fetch('https://httpbin.org/ip');
      const data = await response.json();
      if (data.origin) {
        return { ip: data.origin };
      }
    } catch (error) {
      console.warn('Failed to get IP from httpbin.org:', error);
    }

    // Method 4: Check for localhost development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return { ip: '127.0.0.1' };
    }

    // If all methods fail, return a default IP
    return { ip: '127.0.0.1', error: 'Unable to detect IP address' };
  } catch (error) {
    console.error('Error detecting IP:', error);
    return { ip: '127.0.0.1', error: 'Error detecting IP address' };
  }
};

// Cache IP address for performance
let cachedIP: string | null = null;
let ipFetchPromise: Promise<IPInfo> | null = null;

export const getCachedClientIP = (): Promise<IPInfo> => {
  if (cachedIP) {
    return Promise.resolve({ ip: cachedIP });
  }

  if (ipFetchPromise) {
    return ipFetchPromise;
  }

  ipFetchPromise = getClientIP().then((result) => {
    if (!result.error) {
      cachedIP = result.ip;
    }
    ipFetchPromise = null;
    return result;
  });

  return ipFetchPromise;
};

// Validate IP address format
export const isValidIPAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Check if IP is private/local
export const isPrivateIP = (ip: string): boolean => {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const first = parseInt(parts[0]);
  const second = parseInt(parts[1]);

  // 127.x.x.x (localhost)
  if (first === 127) return true;
  
  // 10.x.x.x
  if (first === 10) return true;
  
  // 172.16.x.x - 172.31.x.x
  if (first === 172 && second >= 16 && second <= 31) return true;
  
  // 192.168.x.x
  if (first === 192 && second === 168) return true;

  return false;
}; 
