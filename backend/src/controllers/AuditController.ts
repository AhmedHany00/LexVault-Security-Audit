import { IncomingMessage, ServerResponse } from 'http';
import { AppDataSource }  from '../config/database';
import { AuditLog }       from '../entities/AuditLog';
import { UserRole }       from '../entities/User';
import { AuthRequest }    from '../middleware/authMiddleware';
import { sendJsonResponse } from '../utils/httpUtils';
export class AuditController {
        static async getLogs(req: AuthRequest, res: ServerResponse): Promise<void> {
        if (req.user?.role !== UserRole.ADMIN) {
            return sendJsonResponse(res, 403, { message: 'Forbidden: Admin access required' });
        }
        try {
            const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
            const limit  = Math.min(parseInt(urlObj.searchParams.get('limit') || '100', 10), 500);
            const action = urlObj.searchParams.get('action') || undefined;
            const auditRepo = AppDataSource.getRepository(AuditLog);
            const query = auditRepo
                .createQueryBuilder('log')
                .leftJoinAndSelect('log.user', 'user')
                .orderBy('log.timestamp', 'DESC')
                .take(limit);
            if (action) {
                query.where('log.action = :action', { action });
            }
            const logs = await query.getMany();
            const safeLogs = logs.map(log => ({
                ...log,
                user: log.user ? {
                    id:        log.user.id,
                    email:     log.user.email,
                    firstName: log.user.firstName,
                    lastName:  log.user.lastName,
                    role:      log.user.role,
                } : null,
            }));
            return sendJsonResponse(res, 200, { logs: safeLogs, total: safeLogs.length });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to fetch audit logs' });
        }
    }
}
