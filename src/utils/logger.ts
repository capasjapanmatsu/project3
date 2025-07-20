// Production-safe logging utility
interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

class ProductionLogger implements Logger {
  private isDevelopment = import.meta.env.DEV;
  private isDebugEnabled = import.meta.env.VITE_DEBUG === 'true' || this.isDevelopment;

  debug(message: string, ...args: unknown[]): void {
    if (this.isDebugEnabled) {
      console.debug(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment || this.isDebugEnabled) {
      console.info(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }
}

// Create singleton logger instance
export const logger = new ProductionLogger();

// Performance monitoring utilities
export const performanceLogger = {
  mark: (name: string): void => {
    if (import.meta.env.DEV && performance.mark) {
      performance.mark(name);
      logger.debug(`Performance mark: ${name}`);
    }
  },

  measure: (name: string, startMark: string, endMark?: string): void => {
    if (import.meta.env.DEV && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name);
        const measure = measures[measures.length - 1]; // Get the latest measure
        if (measure && 'duration' in measure) {
          logger.debug(`Performance measure: ${name} - ${measure.duration.toFixed(2)}ms`);
        }
      } catch (error) {
        logger.warn(`Performance measurement failed: ${name}`, error);
      }
    }
  },

  clearMarks: (): void => {
    if (import.meta.env.DEV && performance.clearMarks) {
      performance.clearMarks();
    }
  },

  clearMeasures: (): void => {
    if (import.meta.env.DEV && performance.clearMeasures) {
      performance.clearMeasures();
    }
  }
};

// Development-only utilities
export const devUtils = {
  logRender: (componentName: string, props?: Record<string, unknown>): void => {
    if (import.meta.env.DEV) {
      logger.debug(`🔄 Rendering ${componentName}`, props);
    }
  },

  logMount: (componentName: string): void => {
    if (import.meta.env.DEV) {
      logger.debug(`🚀 Mounted ${componentName}`);
    }
  },

  logUnmount: (componentName: string): void => {
    if (import.meta.env.DEV) {
      logger.debug(`🗑️ Unmounted ${componentName}`);
    }
  },

  logError: (componentName: string, error: Error): void => {
    logger.error(`Component error in ${componentName}:`, error);
  },

  logApiCall: (method: string, url: string, payload?: unknown): void => {
    if (import.meta.env.DEV) {
      logger.debug(`🌐 API ${method} ${url}`, payload);
    }
  },

  logApiResponse: (method: string, url: string, status: number, data?: unknown): void => {
    if (import.meta.env.DEV) {
      const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌';
      logger.debug(`${statusEmoji} API ${method} ${url} - ${status}`, data);
    }
  }
};

// Replace console.log usage with proper logging
export const replaceConsoleLog = (): void => {
  if (!import.meta.env.DEV) {
    // In production, replace console methods to prevent accidental logging
    const noop = () => {};
    
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    
    // Keep warn and error for important issues
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args) => {
      // Only log warnings in production if they're related to React or critical issues
      const message = args[0]?.toString() || '';
      if (message.includes('React') || message.includes('Warning') || message.includes('Error')) {
        originalWarn(...args);
      }
    };
    
    console.error = (...args) => {
      // Always log errors in production
      originalError(...args);
    };
  }
};

// Initialize logging system
replaceConsoleLog(); 
