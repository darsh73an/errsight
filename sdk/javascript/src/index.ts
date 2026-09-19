// sdk/javascript/src/index.ts

interface ErrSightConfig {
  apiKey: string;
  environment?: string;
  endpoint?: string;
  release?: string;
  userId?: string;
  beforeSend?: (event: any) => any;
}

class ErrSightSDK {
  private config: ErrSightConfig;
  private breadcrumbs: any[] = [];
  private initialized = false;

  constructor() {
    this.config = {
      apiKey: '',
      environment: 'production',
      endpoint: 'http://localhost:3000/api/ingest',
    };
  }

  init(config: ErrSightConfig) {
    this.config = { ...this.config, ...config };
    this.initialized = true;

    // Auto-capture uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureException(event.error || new Error(event.message));
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(
          event.reason instanceof Error 
            ? event.reason 
            : new Error(String(event.reason))
        );
      });
    } else {
      // Node.js
      process.on('uncaughtException', (error) => {
        this.captureException(error);
      });

      process.on('unhandledRejection', (reason) => {
        this.captureException(
          reason instanceof Error ? reason : new Error(String(reason))
        );
      });
    }

    console.log('[ErrSight] Initialized');
  }

  // Add breadcrumb (user action tracking)
  addBreadcrumb(message: string, data?: any) {
    this.breadcrumbs.push({
      message,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep last 20 only
    if (this.breadcrumbs.length > 20) {
      this.breadcrumbs.shift();
    }
  }

  // Capture an exception manually
  captureException(error: Error, context?: any) {
    if (!this.initialized) {
      console.warn('[ErrSight] Not initialized');
      return;
    }

    const event = {
      message: error.message,
      stack: error.stack,
      level: 'error',
      context: {
        environment: this.config.environment,
        release: this.config.release,
        userId: this.config.userId,
        breadcrumbs: this.breadcrumbs,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...context,
      },
    };

    // Allow user to modify event before sending
    const finalEvent = this.config.beforeSend 
      ? this.config.beforeSend(event) 
      : event;

    this.sendEvent(finalEvent);
  }

  // Capture a message (not an error)
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.captureException(new Error(message), { level });
  }

  private async sendEvent(event: any) {
    try {
      const response = await fetch(this.config.endpoint!, {//        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        console.error('[ErrSight] Failed to send event:', response.status);
      }
    } catch (err) {
      console.error('[ErrSight] Network error:', err);
    }
  }
}

// Export singleton
export const ErrSight = new ErrSightSDK();
export default ErrSight;