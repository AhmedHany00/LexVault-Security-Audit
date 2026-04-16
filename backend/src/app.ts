import { IncomingMessage, ServerResponse } from 'http';
import { handleAuthRoutes }     from './routes/authRoutes';
import { handleCaseRoutes }     from './routes/caseRoutes';
import { handleDocumentRoutes } from './routes/documentRoutes';
import { handleUserRoutes }     from './routes/userRoutes';
import { handleAuditRoutes }    from './routes/auditRoutes';
import { sendJsonResponse }     from './utils/httpUtils';
import { Logger }               from './utils/logger';
export const handleCors = (req: IncomingMessage, res: ServerResponse): boolean => {
    const origin         = req.headers.origin || '';
    const allowedOrigin  = process.env.FRONTEND_URL || '*';
    // If FRONTEND_URL is set, only allow that exact origin; otherwise allow all (dev mode)
    if (allowedOrigin === '*' || origin === allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin',  allowedOrigin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '');
    }
    res.setHeader('Access-Control-Allow-Methods',  'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers',  'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
    }
    return false;
};
export const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
    try {
        if (handleCors(req, res)) return;
        const url    = req.url || '/';
        const method = req.method || 'UNKNOWN';
        Logger.info(`${method} ${url}`);
        if (url.startsWith('/api/auth')) {
            return handleAuthRoutes(req, res, url.split('?')[0]);
        }
        if (url.startsWith('/api/cases')) {
            return handleCaseRoutes(req, res, url.split('?')[0]);
        }
        if (url.startsWith('/api/documents')) {
            return handleDocumentRoutes(req, res, url);
        }
        if (url.startsWith('/api/users')) {
            return handleUserRoutes(req, res, url.split('?')[0]);
        }
        if (url.startsWith('/api/audit')) {
            return handleAuditRoutes(req, res, url);
        }
        if (url === '/' || url === '') {
            return sendJsonResponse(res, 200, {
                message: 'Secure Legal Case & Document Management API',
                version: '2.0.0',
                status:  'running',
            });
        }
        Logger.warn(`Route not found: ${method} ${url}`);
        return sendJsonResponse(res, 404, { message: 'Route not found' });
    } catch (error) {
        Logger.error(`Server error on ${req.method} ${req.url}: ${error}`);
        return sendJsonResponse(res, 500, { message: 'Internal Server Error' });
    }
};
