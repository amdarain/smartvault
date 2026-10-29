/**
 * AI Service — communicates with the AI Web Worker.
 * All heavy CLIP inference runs in a separate thread.
 */

export type AIWorkerMessageType =
  | 'LOAD_MODEL'
  | 'MODEL_LOADED'
  | 'MODEL_PROGRESS'
  | 'MODEL_ERROR'
  | 'EMBED_IMAGE'
  | 'EMBED_TEXT'
  | 'EMBEDDING_RESULT'
  | 'EMBEDDING_ERROR'
  | 'UNLOAD_MODEL';

export interface AIWorkerMessage {
  type: AIWorkerMessageType;
  id?: string;
  payload?: unknown;
}

export interface ModelProgress {
  file: string;
  progress: number;
  total: number;
  loaded: number;
  status: string;
}

class AIServiceClass {
  private worker: Worker | null = null;
  private ready = false;
  private loading = false;
  private pendingRequests = new Map<
    string,
    { resolve: (value: Float32Array) => void; reject: (err: Error) => void }
  >();
  private progressListeners: Array<(progress: ModelProgress) => void> = [];
  private readyListeners: Array<(ready: boolean) => void> = [];
  private errorListeners: Array<(error: string) => void> = [];

  /** Returns true if the AI worker is initialized and the model is loaded. */
  get isReady(): boolean {
    return this.ready;
  }

  get isLoading(): boolean {
    return this.loading;
  }

  /** Subscribe to model load progress events. */
  onProgress(listener: (progress: ModelProgress) => void): () => void {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== listener);
    };
  }

  onReady(listener: (ready: boolean) => void): () => void {
    this.readyListeners.push(listener);
    return () => {
      this.readyListeners = this.readyListeners.filter((l) => l !== listener);
    };
  }

  onError(listener: (error: string) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  /** Initializes the worker and starts loading the CLIP model. */
  async loadModel(modelId: string): Promise<void> {
    if (this.loading || this.ready) return;

    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not supported in this browser.');
    }

    this.loading = true;
    this.worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (event: MessageEvent<AIWorkerMessage>) => {
      this.handleWorkerMessage(event.data);
    };

    this.worker.onerror = (err) => {
      this.loading = false;
      this.ready = false;
      this.errorListeners.forEach((l) => l(err.message));
    };

    return new Promise((resolve, reject) => {
      const unsubReady = this.onReady((ready) => {
        if (ready) {
          unsubReady();
          resolve();
        }
      });
      const unsubError = this.onError((err) => {
        unsubError();
        reject(new Error(err));
      });

      this.worker!.postMessage({ type: 'LOAD_MODEL', payload: { modelId } });
    });
  }

  /** Generates an image embedding for a given Blob. */
  async embedImage(id: string, blob: Blob): Promise<Float32Array> {
    if (!this.worker || !this.ready) throw new Error('AI model not loaded.');

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      // Transfer the blob as ArrayBuffer for efficient transfer
      blob.arrayBuffer().then((buffer) => {
        this.worker!.postMessage(
          { type: 'EMBED_IMAGE', id, payload: { buffer, mimeType: blob.type } },
          [buffer],
        );
      });
    });
  }

  /** Generates a text embedding for a query string. */
  async embedText(id: string, text: string): Promise<Float32Array> {
    if (!this.worker || !this.ready) throw new Error('AI model not loaded.');

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'EMBED_TEXT', id, payload: { text } });
    });
  }

  /** Terminates the worker and unloads the model. */
  unload(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.loading = false;
    this.pendingRequests.clear();
  }

  private handleWorkerMessage(msg: AIWorkerMessage): void {
    switch (msg.type) {
      case 'MODEL_LOADED':
        this.loading = false;
        this.ready = true;
        this.readyListeners.forEach((l) => l(true));
        break;

      case 'MODEL_PROGRESS':
        this.progressListeners.forEach((l) => l(msg.payload as ModelProgress));
        break;

      case 'MODEL_ERROR':
        this.loading = false;
        this.ready = false;
        this.errorListeners.forEach((l) => l((msg.payload as { error: string }).error));
        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          pending.reject(new Error('AI model failed to load'));
        }
        this.pendingRequests.clear();
        break;

      case 'EMBEDDING_RESULT': {
        const { id, vector } = msg.payload as { id: string; vector: Float32Array };
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.resolve(vector);
        }
        break;
      }

      case 'EMBEDDING_ERROR': {
        const { id, error } = msg.payload as { id: string; error: string };
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error(error));
        }
        break;
      }
    }
  }
}

export const aiService = new AIServiceClass();
export default aiService;
