/**
 * AI Web Worker — runs CLIP model inference off the main thread.
 * Uses @huggingface/transformers for ONNX-based CLIP embeddings.
 * Supports WebGPU where available, falls back to WASM.
 */

import {
  AutoProcessor,
  CLIPModel,
  RawImage,
  env,
} from '@huggingface/transformers';

// Configure Transformers.js to use local cache only (offline-first)
env.allowRemoteModels = true;
env.useBrowserCache = true;

let processor: any = null;
let model: any = null;
let currentModelId: string | null = null;

type WorkerMessage = {
  type: string;
  id?: string;
  payload?: unknown;
};

function postMsg(msg: WorkerMessage, transfer?: Transferable[]): void {
  if (transfer) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;

  switch (type) {
    case 'LOAD_MODEL': {
      const { modelId } = payload as { modelId: string };
      await loadModel(modelId);
      break;
    }

    case 'EMBED_IMAGE': {
      if (!id) break;
      const { buffer, mimeType } = payload as { buffer: ArrayBuffer; mimeType: string };
      try {
        const vector = await embedImage(buffer, mimeType);
        postMsg(
          { type: 'EMBEDDING_RESULT', payload: { id, vector } },
          [vector.buffer],
        );
      } catch (err) {
        postMsg({ type: 'EMBEDDING_ERROR', payload: { id, error: String(err) } });
      }
      break;
    }

    case 'EMBED_TEXT': {
      if (!id) break;
      const { text } = payload as { text: string };
      try {
        const vector = await embedText(text);
        postMsg(
          { type: 'EMBEDDING_RESULT', payload: { id, vector } },
          [vector.buffer],
        );
      } catch (err) {
        postMsg({ type: 'EMBEDDING_ERROR', payload: { id, error: String(err) } });
      }
      break;
    }

    case 'UNLOAD_MODEL': {
      processor = null;
      model = null;
      currentModelId = null;
      break;
    }
  }
};

async function loadModel(modelId: string): Promise<void> {
  if (currentModelId === modelId && model && processor) {
    postMsg({ type: 'MODEL_LOADED' });
    return;
  }

  try {
    const progressCallback = (progress: {
      file?: string;
      progress?: number;
      total?: number;
      loaded?: number;
      status?: string;
    }) => {
      postMsg({
        type: 'MODEL_PROGRESS',
        payload: {
          file: progress.file ?? '',
          progress: progress.progress ?? 0,
          total: progress.total ?? 0,
          loaded: progress.loaded ?? 0,
          status: progress.status ?? '',
        },
      });
    };

    let device: 'webgpu' | 'wasm' = 'wasm';
    try {
      const nav = navigator as any;
      if (nav.gpu) {
        const adapter = await nav.gpu.requestAdapter();
        if (adapter) device = 'webgpu';
      }
    } catch {
      // Fallback to wasm
    }

    postMsg({
      type: 'MODEL_PROGRESS',
      payload: {
        status: `Loading model (${device})...`,
        progress: 0,
        file: 'initializing',
        total: 0,
        loaded: 0,
      },
    });

    processor = await AutoProcessor.from_pretrained(modelId, {
      progress_callback: progressCallback,
    });

    model = await CLIPModel.from_pretrained(modelId, {
      device,
      progress_callback: progressCallback,
    });

    currentModelId = modelId;
    postMsg({ type: 'MODEL_LOADED' });
  } catch (err) {
    postMsg({ type: 'MODEL_ERROR', payload: { error: String(err) } });
  }
}

async function embedImage(buffer: ArrayBuffer, mimeType: string): Promise<Float32Array> {
  if (!processor || !model) throw new Error('Model not loaded');

  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  let image: any;
  try {
    image = await RawImage.fromURL(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const inputs = await processor(image);
  const output = await model.get_image_features(inputs);

  const data = output.data as Float32Array;
  return l2Normalize(new Float32Array(data));
}

async function embedText(text: string): Promise<Float32Array> {
  if (!processor || !model) throw new Error('Model not loaded');

  const inputs = await processor(text);
  const output = await model.get_text_features(inputs);

  const data = output.data as Float32Array;
  return l2Normalize(new Float32Array(data));
}

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}
