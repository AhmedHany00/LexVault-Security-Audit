import { IncomingMessage, ServerResponse } from 'http';
import { AppDataSource }               from '../config/database';
import { Case, CaseStatus }            from '../entities/Case';
import { Document }                    from '../entities/Document';
import { User, UserRole }              from '../entities/User';
import { AuditLog }                    from '../entities/AuditLog';
import { AuthRequest }                 from '../middleware/authMiddleware';
import { parseJsonBody, sendJsonResponse } from '../utils/httpUtils';
export class CaseController {
    static async createCase(req: AuthRequest, res: ServerResponse): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const { title, description, caseNumber, clientId, lawyerId } = body;
            if (!title || !caseNumber) {
                return sendJsonResponse(res, 400, { message: 'title and caseNumber are required' });
            }
            const caseRepo = AppDataSource.getRepository(Case);
            const userRepo = AppDataSource.getRepository(User);
            let client: User | null = null;
            if (clientId) {
                client = await userRepo.findOne({ where: { id: clientId } });
            }
            let assignedLawyer: User | null = null;
            if (lawyerId && req.user?.role === UserRole.ADMIN) {
                assignedLawyer = await userRepo.findOne({ where: { id: lawyerId } }) || null;
            } else if (req.user?.role === UserRole.LAWYER) {
                assignedLawyer = { id: req.user.userId } as User;
            }
            const newCase = caseRepo.create({
                title,
                description: description || '',
                caseNumber,
                status:         CaseStatus.PENDING,
                assignedLawyer: assignedLawyer || undefined,
                client:         client         || undefined,
            });
            await caseRepo.save(newCase);
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'CREATE_CASE',
                details: `Case created: ${caseNumber} — "${title}"`,
                user:    { id: req.user?.userId } as User,
            }));
            return sendJsonResponse(res, 201, { message: 'Case created successfully', case: newCase });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to create case' });
        }
    }
    static async getCases(req: AuthRequest, res: ServerResponse): Promise<void> {
        try {
            const caseRepo = AppDataSource.getRepository(Case);
            let cases: Case[] = [];
            if (req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.PARALEGAL) {
                cases = await caseRepo.find();
            } else if (req.user?.role === UserRole.LAWYER) {
                cases = await caseRepo.find({ where: { assignedLawyer: { id: req.user.userId } } });
            } else {
                cases = await caseRepo.find({ where: { client: { id: req.user?.userId } } });
            }
            return sendJsonResponse(res, 200, { cases });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to fetch cases' });
        }
    }
    static async updateCase(req: AuthRequest, res: ServerResponse, caseId: string): Promise<void> {
        try {
            const body = await parseJsonBody(req);
            const {
                title, description, status,
                lawyerId, clientId,
                attachDocumentIds, detachDocumentIds,
            } = body;
            const caseRepo = AppDataSource.getRepository(Case);
            const userRepo = AppDataSource.getRepository(User);
            const docRepo  = AppDataSource.getRepository(Document);
            const legalCase = await caseRepo.findOne({ where: { id: caseId } });
            if (!legalCase) {
                return sendJsonResponse(res, 404, { message: 'Case not found' });
            }
            if (req.user?.role === UserRole.LAWYER) {
                if (legalCase.assignedLawyer?.id !== req.user.userId) {
                    return sendJsonResponse(res, 403, { message: 'Forbidden: You can only edit cases assigned to you' });
                }
            }
            if (title)       legalCase.title       = title;
            if (description !== undefined) legalCase.description = description;
            if (status) {
                const validStatuses = Object.values(CaseStatus) as string[];
                if (!validStatuses.includes(status)) {
                    return sendJsonResponse(res, 400, { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
                }
                legalCase.status = status as CaseStatus;
            }
            if (lawyerId !== undefined && req.user?.role === UserRole.ADMIN) {
                if (lawyerId === '' || lawyerId === null) {
                    legalCase.assignedLawyer = null;
                } else {
                    const lawyer = await userRepo.findOne({ where: { id: lawyerId } });
                    if (!lawyer) return sendJsonResponse(res, 404, { message: 'Lawyer not found' });
                    legalCase.assignedLawyer = lawyer;
                }
            }
            if (clientId !== undefined) {
                if (clientId === '' || clientId === null) {
                    legalCase.client = null;
                } else {
                    const client = await userRepo.findOne({ where: { id: clientId } });
                    if (!client) return sendJsonResponse(res, 404, { message: 'Client not found' });
                    legalCase.client = client;
                }
            }
            await caseRepo.save(legalCase);
            if (Array.isArray(attachDocumentIds) && attachDocumentIds.length > 0) {
                for (const docId of attachDocumentIds) {
                    const doc = await docRepo.findOne({ where: { id: docId } });
                    if (doc) {
                        doc.case = legalCase;
                        await docRepo.save(doc);
                    }
                }
            }
            if (Array.isArray(detachDocumentIds) && detachDocumentIds.length > 0) {
                for (const docId of detachDocumentIds) {
                    const doc = await docRepo.findOne({ where: { id: docId } });
                    if (doc && doc.case?.id === caseId) {
                        doc.case = null;
                        await docRepo.save(doc);
                    }
                }
            }
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'UPDATE_CASE',
                details: `Case ${legalCase.caseNumber} updated by ${req.user?.role} (${req.user?.userId})`,
                user:    { id: req.user?.userId } as User,
            }));
            const updated = await caseRepo.findOne({ where: { id: caseId } });
            return sendJsonResponse(res, 200, { message: 'Case updated successfully', case: updated });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to update case' });
        }
    }
}
