import { IncomingMessage, ServerResponse } from 'http';
import { AuditController }  from '../controllers/AuditController';
import { authenticateJWT, AuthRequest } from '../middleware/authMiddleware';
import { sendJsonResponse } from '../utils/httpUtils';
export const handleAuditRoutes = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: string
) => {
    const authReq = req as AuthRequest;
    const isAuthenticated = await authenticateJWT(authReq, res);
    if (!isAuthenticated) return;
    if (req.method === 'GET' && url.startsWith('/api/audit')) {
        return AuditController.getLogs(authReq, res);
    }
    return sendJsonResponse(res, 404, { message: 'Audit route not found' });
};
