import { IncomingMessage, ServerResponse } from 'http';
import { IncomingForm, File }  from 'formidable';
import fs                      from 'fs';
import crypto                  from 'crypto';
import path                    from 'path';
import { AppDataSource }       from '../config/database';
import { Document }            from '../entities/Document';
import { Case }                from '../entities/Case';
import { User }                from '../entities/User';
import { AuditLog }            from '../entities/AuditLog';
import { AuthRequest }         from '../middleware/authMiddleware';
import { parseJsonBody, sendJsonResponse } from '../utils/httpUtils';
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const calculateFileHash = (filePath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const hash   = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data',  chunk => hash.update(chunk));
        stream.on('end',   () => resolve(hash.digest('hex')));
    });
export class DocumentController {
    static async uploadDocument(req: AuthRequest, res: ServerResponse): Promise<void> {
        const form = new IncomingForm({
            uploadDir:     UPLOAD_DIR,
            keepExtensions: true,
            maxFileSize:   50 * 1024 * 1024, 
        });
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error(err);
                return sendJsonResponse(res, 400, { message: 'Failed to process file upload' });
            }
            try {
                const caseId      = Array.isArray(fields.caseId) ? fields.caseId[0] : fields.caseId as string | undefined;
                const title       = (Array.isArray(fields.title) ? fields.title[0] : fields.title as string | undefined) || 'Untitled Document';
                const fileArray   = files.document;
                const uploadedFile: File | undefined = Array.isArray(fileArray) ? fileArray[0] : fileArray;
                if (!uploadedFile) {
                    return sendJsonResponse(res, 400, { message: 'document file is required' });
                }
                const fileHash = await calculateFileHash(uploadedFile.filepath);
                const caseRepo = AppDataSource.getRepository(Case);
                const docRepo  = AppDataSource.getRepository(Document);
                let legalCase: Case | null = null;
                if (caseId) {
                    legalCase = await caseRepo.findOne({ where: { id: caseId } });
                    if (!legalCase) {
                        return sendJsonResponse(res, 404, { message: 'Case not found' });
                    }
                }
                const newDoc = docRepo.create({
                    title,
                    originalFilename: uploadedFile.originalFilename || 'unknown',
                    storagePath:      uploadedFile.filepath,
                    fileHash,
                    case:             legalCase || undefined,
                    uploadedBy:       { id: req.user?.userId } as User,
                });
                await docRepo.save(newDoc);
                const auditRepo = AppDataSource.getRepository(AuditLog);
                await auditRepo.save(auditRepo.create({
                    action:  'UPLOAD_DOCUMENT',
                    details: `Document "${newDoc.title}" (${newDoc.id}) uploaded${legalCase ? ` to case ${legalCase.caseNumber}` : ' (no case)'} — SHA-256: ${fileHash}`,
                    user:    { id: req.user?.userId } as User,
                }));
                return sendJsonResponse(res, 201, { message: 'Document secured and uploaded successfully', document: newDoc });
            } catch (processError) {
                console.error(processError);
                return sendJsonResponse(res, 500, { message: 'Internal Server Error during document processing' });
            }
        });
    }
    static async getDocuments(req: AuthRequest, res: ServerResponse): Promise<void> {
        const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
        const caseId = urlObj.searchParams.get('caseId');
        try {
            const docRepo   = AppDataSource.getRepository(Document);
            const whereClause = caseId ? { case: { id: caseId } } : {};
            const documents = await docRepo.find({
                where:     whereClause,
                relations: ['uploadedBy', 'case'],
            });
            return sendJsonResponse(res, 200, { documents });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to fetch documents' });
        }
    }
    static async updateDocument(req: AuthRequest, res: ServerResponse, docId: string): Promise<void> {
        try {
            const body       = await parseJsonBody(req);
            const { title, caseId } = body;
            const docRepo  = AppDataSource.getRepository(Document);
            const caseRepo = AppDataSource.getRepository(Case);
            const doc = await docRepo.findOne({ where: { id: docId }, relations: ['uploadedBy'] });
            if (!doc) {
                return sendJsonResponse(res, 404, { message: 'Document not found' });
            }
            if (req.user?.role !== 'admin' && doc.uploadedBy?.id !== req.user?.userId) {
                return sendJsonResponse(res, 403, { message: 'Forbidden: You can only edit documents you uploaded' });
            }
            if (title) doc.title = title;
            if (caseId !== undefined) {
                if (!caseId) {
                    doc.case = null;
                } else {
                    const legalCase = await caseRepo.findOne({ where: { id: caseId } });
                    if (!legalCase) {
                        return sendJsonResponse(res, 404, { message: 'Case not found' });
                    }
                    doc.case = legalCase;
                }
            }
            await docRepo.save(doc);
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'UPDATE_DOCUMENT',
                details: `Document ${docId} updated by ${req.user?.role} (${req.user?.userId})`,
                user:    { id: req.user?.userId } as User,
            }));
            return sendJsonResponse(res, 200, { message: 'Document updated successfully', document: doc });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Failed to update document' });
        }
    }
    static async downloadDocument(req: AuthRequest, res: ServerResponse): Promise<void> {
        const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
        const docId  = urlObj.pathname.split('/').pop();
        if (!docId) {
            return sendJsonResponse(res, 400, { message: 'Document ID is required' });
        }
        try {
            const docRepo  = AppDataSource.getRepository(Document);
            const document = await docRepo.findOne({ where: { id: docId } });
            if (!document) {
                return sendJsonResponse(res, 404, { message: 'Document not found' });
            }
            const actualPath = path.join(__dirname, '../../uploads', path.basename(document.storagePath));
            if (!fs.existsSync(actualPath)) {
                return sendJsonResponse(res, 404, { message: 'File is missing from server storage' });
            }
            const currentHash = await calculateFileHash(actualPath);
            if (currentHash !== document.fileHash) {
                const auditRepo = AppDataSource.getRepository(AuditLog);
                await auditRepo.save(auditRepo.create({
                    action:  'SECURITY_ALERT',
                    details: `TAMPERING DETECTED for document ${document.id}. Expected: ${document.fileHash}, got: ${currentHash}`,
                    user:    { id: req.user?.userId } as User,
                }));
                return sendJsonResponse(res, 403, { message: 'SECURITY ALERT: File integrity verification failed. The file has been modified or corrupted.' });
            }
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'DOWNLOAD_DOCUMENT',
                details: `Document ${document.id} downloaded securely (hash verified)`,
                user:    { id: req.user?.userId } as User,
            }));
            const stat = fs.statSync(actualPath);
            res.writeHead(200, {
                'Content-Length':      stat.size,
                'Content-Type':        'application/octet-stream',
                'Content-Disposition': `attachment; filename="${document.originalFilename}"`,
            });
            fs.createReadStream(actualPath).pipe(res);
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Internal Server Error while downloading document' });
        }
    }
    static async deleteDocument(req: AuthRequest, res: ServerResponse, docId: string): Promise<void> {
        try {
            const docRepo  = AppDataSource.getRepository(Document);
            const document = await docRepo.findOne({ where: { id: docId } });
            if (!document) {
                return sendJsonResponse(res, 404, { message: 'Document not found' });
            }
            const actualPath = path.join(__dirname, '../../uploads', path.basename(document.storagePath));
            if (fs.existsSync(actualPath)) {
                try { fs.unlinkSync(actualPath); } catch {  }
            }
            const title = document.title;
            await docRepo.remove(document);
            const auditRepo = AppDataSource.getRepository(AuditLog);
            await auditRepo.save(auditRepo.create({
                action:  'DELETE_DOCUMENT',
                details: `Document "${title}" (${docId}) deleted by admin (${req.user?.userId})`,
                user:    { id: req.user?.userId } as User,
            }));
            return sendJsonResponse(res, 200, { message: 'Document deleted successfully' });
        } catch (error) {
            console.error(error);
            return sendJsonResponse(res, 500, { message: 'Internal Server Error while deleting document' });
        }
    }
}
