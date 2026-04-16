import { IncomingMessage, ServerResponse } from 'http';
import { UserController }   from '../controllers/UserController';
import { authenticateJWT, AuthRequest } from '../middleware/authMiddleware';
import { sendJsonResponse } from '../utils/httpUtils';
export const handleUserRoutes = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: string
) => {
    const authReq = req as AuthRequest;
    const isAuthenticated = await authenticateJWT(authReq, res);
    if (!isAuthenticated) return;
    if (req.method === 'GET' && url === '/api/users') {
        return UserController.getUsers(authReq, res);
    }
    return sendJsonResponse(res, 404, { message: 'User route not found' });
};
