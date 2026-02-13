// Real-time event system using Server-Sent Events
// Uses Redis pub/sub when REDIS_URL is available, falls back to in-memory EventTarget

type RealtimeEvent = {
  type: string;
  workspaceId: string;
  data: Record<string, unknown>;
};

interface RealtimeBackend {
  publish(channel: string, event: RealtimeEvent): void;
  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void
  ): () => void;
}

// In-memory backend for development / single-server deployments
class InMemoryBackend implements RealtimeBackend {
  private emitter = new EventTarget();

  publish(channel: string, event: RealtimeEvent) {
    const customEvent = new CustomEvent(channel, { detail: event });
    this.emitter.dispatchEvent(customEvent);
  }

  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimeEvent>;
      callback(customEvent.detail);
    };
    this.emitter.addEventListener(channel, handler);
    return () => this.emitter.removeEventListener(channel, handler);
  }
}

// Redis backend for production / multi-server deployments
class RedisBackend implements RealtimeBackend {
  private subscribers = new Map<
    string,
    Set<(event: RealtimeEvent) => void>
  >();
  private pubClient: any;
  private subClient: any;
  private ready = false;

  constructor(redisUrl: string) {
    this.initRedis(redisUrl).catch((err) => {
      console.error(
        "Redis realtime init failed, falling back to in-memory:",
        err
      );
    });
  }

  private async initRedis(redisUrl: string) {
    try {
      const { default: Redis } = await import("ioredis");
      this.pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      this.subClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.subClient.on("message", (channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as RealtimeEvent;
          const callbacks = this.subscribers.get(channel);
          if (callbacks) {
            for (const cb of callbacks) {
              cb(event);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      });

      this.ready = true;
    } catch {
      // Redis not available — methods will no-op
    }
  }

  publish(channel: string, event: RealtimeEvent) {
    if (!this.ready || !this.pubClient) return;
    this.pubClient.publish(channel, JSON.stringify(event)).catch(() => {});
  }

  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      if (this.ready && this.subClient) {
        this.subClient.subscribe(channel).catch(() => {});
      }
    }
    this.subscribers.get(channel)!.add(callback);

    return () => {
      const callbacks = this.subscribers.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(channel);
          if (this.ready && this.subClient) {
            this.subClient.unsubscribe(channel).catch(() => {});
          }
        }
      }
    };
  }
}

class RealtimeService {
  private backend: RealtimeBackend;
  private fallback: InMemoryBackend;

  constructor() {
    this.fallback = new InMemoryBackend();
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.backend = new RedisBackend(redisUrl);
    } else {
      this.backend = this.fallback;
    }
  }

  publish(event: RealtimeEvent) {
    const channel = `realtime:${event.workspaceId}`;
    this.backend.publish(channel, event);
    // Also publish to in-memory for same-server SSE subscribers
    if (this.backend !== this.fallback) {
      this.fallback.publish(channel, event);
    }
  }

  subscribe(
    workspaceId: string,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    const channel = `realtime:${workspaceId}`;
    // For Redis backend, subscribe to both for cross-server + same-server
    const unsubBackend = this.backend.subscribe(channel, callback);
    if (this.backend !== this.fallback) {
      const unsubFallback = this.fallback.subscribe(channel, callback);
      return () => {
        unsubBackend();
        unsubFallback();
      };
    }
    return unsubBackend;
  }
}

export const realtime = new RealtimeService();

// Event types for type safety
export const REALTIME_EVENTS = {
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_COMPLETED: "task.completed",
  TASK_DELETED: "task.deleted",
  COMMENT_ADDED: "comment.added",
  PROJECT_UPDATED: "project.updated",
  NOTIFICATION_NEW: "notification.new",
} as const;
