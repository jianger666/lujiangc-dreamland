/**
 * Feishu feedback relay store.
 *
 * Uses Vercel KV (Upstash Redis) for persistence.
 * Falls back to in-memory Map for local development.
 */

let kv: any = null;

async function getKV() {
  if (kv) return kv;

  try {
    const mod = await import('@vercel/kv');
    kv = mod.kv;
    return kv;
  } catch {
    console.warn(
      '[FeishuStore] @vercel/kv not available, using in-memory store'
    );
    return null;
  }
}

const memoryStore = new Map<string, { value: any; expiresAt?: number }>();

async function kvSet(key: string, value: any, ttlSeconds?: number) {
  const store = await getKV();
  if (store) {
    if (ttlSeconds) {
      await store.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      await store.set(key, JSON.stringify(value));
    }
  } else {
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }
}

async function kvGet<T>(key: string): Promise<T | null> {
  const store = await getKV();
  if (store) {
    const raw = await store.get(key);
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as T);
    } catch {
      return raw as T;
    }
  } else {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value as T;
  }
}

async function kvDel(key: string) {
  const store = await getKV();
  if (store) {
    await store.del(key);
  } else {
    memoryStore.delete(key);
  }
}

// --- Pair (binding) ---

export interface PairData {
  feishuOpenId: string;
  chatId?: string;
  createdAt: number;
}

export async function savePair(pairCode: string, data: PairData) {
  await kvSet(`pair:${pairCode}`, data);
  await kvSet(`user:${data.feishuOpenId}`, { pairCode, chatId: data.chatId });
}

export async function getPairByCode(code: string): Promise<PairData | null> {
  return kvGet<PairData>(`pair:${code}`);
}

export async function getPairByUser(
  feishuOpenId: string
): Promise<{ pairCode: string; chatId?: string } | null> {
  return kvGet(`user:${feishuOpenId}`);
}

// --- Pending feedback request ---

export interface PendingRequest {
  requestId: string;
  summary: string;
  pairCode: string;
  createdAt: number;
}

export async function savePendingRequest(
  feishuOpenId: string,
  request: PendingRequest
) {
  await kvSet(`pending:${feishuOpenId}`, request, 600);
  await kvSet(
    `req:${request.requestId}`,
    { feishuOpenId, status: 'pending' },
    600
  );
}

export async function getPendingRequest(
  feishuOpenId: string
): Promise<PendingRequest | null> {
  return kvGet<PendingRequest>(`pending:${feishuOpenId}`);
}

// --- Reply ---

export interface ReplyData {
  content: string;
  images?: string[];
  repliedAt: number;
}

export async function saveReply(requestId: string, reply: ReplyData) {
  await kvSet(`reply:${requestId}`, reply, 600);
}

export async function getReply(requestId: string): Promise<ReplyData | null> {
  return kvGet<ReplyData>(`reply:${requestId}`);
}

export async function consumeReply(
  requestId: string
): Promise<ReplyData | null> {
  const reply = await getReply(requestId);
  if (reply) {
    await kvDel(`reply:${requestId}`);
    await kvDel(`req:${requestId}`);
  }
  return reply;
}
