import { IncomingMessage, ServerResponse } from 'http';
import jwt from 'jsonwebtoken';
import { UserRole } from '../entities/User';
import { sendJsonResponse } from '../utils/httpUtils';
export interface AuthRequest extends IncomingMessage {
    user?: {
        userId: string;
        role: UserRole;
    };
}
export const authenticateJWT = (req: AuthRequest, res: ServerResponse): Promise<boolean> => {
    return new Promise((resolve) => {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user: any) => {
                if (err) {
                    sendJsonResponse(res, 403, { message: 'Forbidden: Invalid Token' });
                    return resolve(false);
                }
                if (user && user.role) {
                    user.role = user.role.toLowerCase() as UserRole;
                }
                req.user = user;
                resolve(true);
            });
        } else {
            sendJsonResponse(res, 401, { message: 'Unauthorized' });
            resolve(false);
        }
    });
};
export const authorizeRoles = (roles: UserRole[]) => {
    return (req: AuthRequest, res: ServerResponse): boolean => {
        if (!req.user || !roles.includes(req.user.role)) {
            sendJsonResponse(res, 403, { message: 'Forbidden: Insufficient Permissions' });
            return false;
        }
        return true;
    };
};
