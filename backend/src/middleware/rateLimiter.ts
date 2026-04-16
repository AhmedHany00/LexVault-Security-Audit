import { IncomingMessage, ServerResponse } from 'http';
import { sendJsonResponse } from '../utils/httpUtils';
interface RateRecord {
    count:       number;
    windowStart: number;
}
const store = new Map<string, RateRecord>();
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
export const rateLimit = (
    req:      IncomingMessage,
    res:      ServerResponse,
    max:      number,
    routeKey: string
): boolean => {
    const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        'unknown';
    const key = `${routeKey}:${ip}`;
    const now = Date.now();
    const record = store.get(key);
    if (!record || now - record.windowStart > WINDOW_MS) {
        store.set(key, { count: 1, windowStart: now });
        return false;  
    }
    record.count += 1;
    if (record.count > max) {
        const retryAfterSecs = Math.ceil((WINDOW_MS - (now - record.windowStart)) / 1000);
        res.setHeader('Retry-After', String(retryAfterSecs));
        sendJsonResponse(res, 429, {
            message: `Too many requests. Please try again in ${retryAfterSecs} seconds.`,
        });
        return true;   
    }
    return false;  
};
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
        if (now - record.windowStart > WINDOW_MS) {
            store.delete(key);
        }
    }
}, WINDOW_MS);
