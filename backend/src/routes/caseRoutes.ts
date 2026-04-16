import { IncomingMessage, ServerResponse } from 'http';
import { CaseController }   from '../controllers/CaseController';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middleware/authMiddleware';
import { UserRole }         from '../entities/User';
import { sendJsonResponse } from '../utils/httpUtils';
export const handleCaseRoutes = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: string
) => {
    const authReq = req as AuthRequest;
    const isAuthenticated = await authenticateJWT(authReq, res);
    if (!isAuthenticated) return;
    if (req.method === 'POST' && url === '/api/cases') {
        if (!authorizeRoles([UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL])(authReq, res)) return;
        return CaseController.createCase(authReq, res);
    }
    if (req.method === 'GET' && url === '/api/cases') {
        return CaseController.getCases(authReq, res);
    }
    const putMatch = url.match(/^\/api\/cases\/([^/]+)$/);
    if (req.method === 'PUT' && putMatch) {
        const caseId = putMatch[1];
        if (!authorizeRoles([UserRole.ADMIN, UserRole.LAWYER])(authReq, res)) return;
        return CaseController.updateCase(authReq, res, caseId);
    }
    return sendJsonResponse(res, 404, { message: 'Case route not found' });
};
