import { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import fs     from 'fs';
import path   from 'path';
import { AppDataSource }               from '../config/database';
import { User, UserRole }              from '../entities/User';
import { Document }                    from '../entities/Document';
import { AuditLog }                    from '../entities/AuditLog';
import { Case }                        from '../entities/Case';
import { AuthRequest }                 from '../middleware/authMiddleware';
import { parseJsonBody, sendJsonResponse } from '../utils/httpUtils';
export class AuthController {
    static async register(req: IncomingMessage, res: ServerResponse): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const { firstName, lastName, email, password, role } = body;
            if (!firstName || !lastName || !email || !password) {
                return sendJsonResponse(res, 400, { message: 'firstName, lastName, email and password are required' });
            }
            const userRepo = AppDataSource.getRepository(User);
            const existing = await userRepo.findOne({ where: { email } });
            if (existing) {
                return sendJsonResponse(res, 400, { message: 'User already exists' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = userRepo.create({
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role: role || UserRole.CLIENT,
            });
            await userRepo.save(user);
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'REGISTER',
                details: `User registered: ${email} (${user.role})`,
                user,
            }));
            return sendJsonResponse(res, 201, { message: 'User registered successfully' });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Server error' });
        }
    }
    static async login(req: IncomingMessage, res: ServerResponse): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const { email, password } = body;
            const userRepo = AppDataSource.getRepository(User);
            const user     = await userRepo.findOne({ where: { email } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return sendJsonResponse(res, 400, { message: 'Invalid credentials' });
            }
            const payload = { userId: user.id, role: user.role };
            const token   = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'LOGIN',
                details: `User logged in: ${email}`,
                user,
            }));
            return sendJsonResponse(res, 200, {
                token,
                role:      user.role,
                firstName: user.firstName,
                lastName:  user.lastName,
                email:     user.email,
            });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Server error' });
        }
    }
    static async updateProfile(req: AuthRequest, res: ServerResponse): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const { firstName, lastName, email } = body;
            const userRepo = AppDataSource.getRepository(User);
            const user     = await userRepo.findOne({ where: { id: req.user?.userId } });
            if (!user) {
                return sendJsonResponse(res, 404, { message: 'User not found' });
            }
            if (email && email !== user.email) {
                const taken = await userRepo.findOne({ where: { email } });
                if (taken) {
                    return sendJsonResponse(res, 400, { message: 'Email is already in use by another account' });
                }
                user.email = email;
            }
            if (firstName) user.firstName = firstName;
            if (lastName)  user.lastName  = lastName;
            await userRepo.save(user);
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'UPDATE_PROFILE',
                details: `User updated profile: ${user.email}`,
                user,
            }));
            return sendJsonResponse(res, 200, {
                message:   'Profile updated successfully',
                firstName: user.firstName,
                lastName:  user.lastName,
                email:     user.email,
            });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Server error' });
        }
    }
    static async changePassword(req: AuthRequest, res: ServerResponse): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const { currentPassword, newPassword } = body;
            if (!currentPassword || !newPassword) {
                return sendJsonResponse(res, 400, { message: 'currentPassword and newPassword are required' });
            }
            if (newPassword.length < 8) {
                return sendJsonResponse(res, 400, { message: 'New password must be at least 8 characters' });
            }
            const userRepo = AppDataSource.getRepository(User);
            const user     = await userRepo.findOne({ where: { id: req.user?.userId } });
            if (!user) {
                return sendJsonResponse(res, 404, { message: 'User not found' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return sendJsonResponse(res, 400, { message: 'Current password is incorrect' });
            }
            user.password = await bcrypt.hash(newPassword, 10);
            await userRepo.save(user);
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'CHANGE_PASSWORD',
                details: `User changed password: ${user.email}`,
                user,
            }));
            return sendJsonResponse(res, 200, { message: 'Password changed successfully' });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Server error' });
        }
    }
    static async deleteAccount(req: AuthRequest, res: ServerResponse): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const { password } = body;
            if (!password) {
                return sendJsonResponse(res, 400, { message: 'Password is required to confirm account deletion' });
            }
            const userRepo = AppDataSource.getRepository(User);
            const user     = await userRepo.findOne({ where: { id: req.user?.userId } });
            if (!user) {
                return sendJsonResponse(res, 404, { message: 'User not found' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return sendJsonResponse(res, 400, { message: 'Incorrect password. Account deletion cancelled.' });
            }
            const docRepo = AppDataSource.getRepository(Document);
            const userDocs = await docRepo.find({ where: { uploadedBy: { id: user.id } } });
            const UPLOAD_DIR = path.join(__dirname, '../../uploads');
            for (const doc of userDocs) {
                const filePath = path.join(UPLOAD_DIR, path.basename(doc.storagePath));
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch {  }
                }
                await docRepo.remove(doc);
            }
            const caseRepo = AppDataSource.getRepository(Case);
            const casesAsLawyer = await caseRepo.find({ where: { assignedLawyer: { id: user.id } } });
            for (const c of casesAsLawyer) {
                c.assignedLawyer = null;
                await caseRepo.save(c);
            }
            const casesAsClient = await caseRepo.find({ where: { client: { id: user.id } } });
            for (const c of casesAsClient) {
                c.client = null;
                await caseRepo.save(c);
            }
            const auditRepo = AppDataSource.getRepository(AuditLog);
            const userLogs = await auditRepo.find({ where: { user: { id: user.id } } });
            for (const log of userLogs) {
                log.user = null as any;
                await auditRepo.save(log);
            }
            await auditRepo.save(auditRepo.create({
                action:  'DELETE_ACCOUNT',
                details: `Account deleted: ${user.email} (${user.role})`
            }));
            await userRepo.remove(user);
            return sendJsonResponse(res, 200, { message: 'Account deleted successfully' });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Server error' });
        }
    }
}
