import { IncomingMessage, ServerResponse } from 'http';
import { DocumentController } from '../controllers/DocumentController';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middleware/authMiddleware';
import { UserRole }         from '../entities/User';
import { sendJsonResponse } from '../utils/httpUtils';
export const handleDocumentRoutes = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: string
) => {
    const authReq = req as AuthRequest;
    const isAuthenticated = await authenticateJWT(authReq, res);
    if (!isAuthenticated) return;
    const baseUrl = url.split('?')[0];
    if (req.method === 'POST' && (baseUrl === '/api/documents' || baseUrl === '/api/documents/upload')) {
        return DocumentController.uploadDocument(authReq, res);
    }
    if (req.method === 'GET' && baseUrl === '/api/documents') {
        return DocumentController.getDocuments(authReq, res);
    }
    const putMatch = baseUrl.match(/^\/api\/documents\/([^/]+)$/);
    if (req.method === 'PUT' && putMatch) {
        const docId = putMatch[1];
        if (!authorizeRoles([UserRole.ADMIN, UserRole.LAWYER])(authReq, res)) return;
        return DocumentController.updateDocument(authReq, res, docId);
    }
    if (req.method === 'GET' && baseUrl.startsWith('/api/documents/')) {
        return DocumentController.downloadDocument(authReq, res);
    }
    const deleteMatch = baseUrl.match(/^\/api\/documents\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteMatch) {
        const docId = deleteMatch[1];
        if (!authorizeRoles([UserRole.ADMIN])(authReq, res)) return;
        return DocumentController.deleteDocument(authReq, res, docId);
    }
    return sendJsonResponse(res, 404, { message: 'Document route not found' });
};
