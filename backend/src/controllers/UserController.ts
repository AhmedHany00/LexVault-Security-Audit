import { ServerResponse } from 'http';
import { AppDataSource }  from '../config/database';
import { User, UserRole } from '../entities/User';
import { AuthRequest }    from '../middleware/authMiddleware';
import { sendJsonResponse } from '../utils/httpUtils';
export class UserController {
        static async getUsers(req: AuthRequest, res: ServerResponse): Promise<void> {
        try {
            const userRepo = AppDataSource.getRepository(User);
            let users: User[] = [];
            if (req.user?.role === UserRole.ADMIN) {
                users = await userRepo.find();
            } else if (req.user?.role === UserRole.LAWYER) {
                users = await userRepo.find({
                    where: [
                        { role: UserRole.CLIENT },
                        { role: UserRole.PARALEGAL },
                    ],
                });
            } else {
                return sendJsonResponse(res, 403, { message: 'Forbidden: Insufficient permissions' });
            }
            const safeUsers = users.map(({ password: _pw, ...rest }) => rest);
            return sendJsonResponse(res, 200, { users: safeUsers });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to fetch users' });
        }
    }
}
