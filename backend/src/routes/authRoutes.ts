import { IncomingMessage, ServerResponse } from 'http';
import { AuthController }      from '../controllers/AuthController';
import { authenticateJWT }     from '../middleware/authMiddleware';
import { AuthRequest }         from '../middleware/authMiddleware';
import { rateLimit }           from '../middleware/rateLimiter';
import { sendJsonResponse }    from '../utils/httpUtils';
const LOGIN_MAX    = parseInt(process.env.RATE_LIMIT_LOGIN_MAX    || '10', 10);
const REGISTER_MAX = parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '5',  10);
export const handleAuthRoutes = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: string
) => {
    if (req.method === 'POST' && url === '/api/auth/register') {
        if (rateLimit(req, res, REGISTER_MAX, 'register')) return;
        return AuthController.register(req, res);
    }
    if (req.method === 'POST' && url === '/api/auth/login') {
        if (rateLimit(req, res, LOGIN_MAX, 'login')) return;
        return AuthController.login(req, res);
    }
    if (req.method === 'PUT' && url === '/api/auth/profile') {
        const authReq = req as AuthRequest;
        const ok = await authenticateJWT(authReq, res);
        if (!ok) return;
        return AuthController.updateProfile(authReq, res);
    }
    if (req.method === 'POST' && url === '/api/auth/change-password') {
        const authReq = req as AuthRequest;
        const ok = await authenticateJWT(authReq, res);
        if (!ok) return;
        return AuthController.changePassword(authReq, res);
    }
    if (req.method === 'DELETE' && url === '/api/auth/account') {
        const authReq = req as AuthRequest;
        const ok = await authenticateJWT(authReq, res);
        if (!ok) return;
        return AuthController.deleteAccount(authReq, res);
    }
    return sendJsonResponse(res, 404, { message: 'Auth route not found' });
};
