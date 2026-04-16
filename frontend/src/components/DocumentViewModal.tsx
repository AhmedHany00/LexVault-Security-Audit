import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Divider, Chip, Alert,
} from '@mui/material';
import {
  FileText, Hash, Briefcase, User, Calendar,
  Download, Info,
} from 'lucide-react';
import type { LegalDocument, LegalCase } from '../types';
interface DocumentViewModalProps {
  open: boolean;
  doc: LegalDocument | null;
  cases: LegalCase[];
  onClose: () => void;
  onDownload: (docId: string, filename: string) => void;
}
export const DocumentViewModal = ({ open, doc, cases, onClose, onDownload }: DocumentViewModalProps) => {
  if (!doc) return null;
  const linkedCase = doc.case ?? null;
  const fallbackCase = linkedCase || cases.find(c => c.id === doc.case?.id);
  const details = [
    { icon: <FileText size={16} />, label: 'Document Title', value: doc.title },
    { icon: <FileText size={16} />, label: 'Original Filename', value: doc.originalFilename },
    {
      icon: <Briefcase size={16} />,
      label: 'Linked Matter',
      value: fallbackCase
        ? `${fallbackCase.caseNumber} — ${fallbackCase.title}`
        : 'Independent document',
    },
    {
      icon: <User size={16} />,
      label: 'Uploaded By',
      value: doc.uploadedBy
        ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName} (${doc.uploadedBy.email})`
        : '—',
    },
    {
      icon: <Calendar size={16} />,
      label: 'Upload Date',
      value: new Date(doc.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
    },
  ];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.12)' }}>
            <FileText size={20} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>Document Details</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Integrity-verified and ready for download</Typography>
          </Box>
          <Chip label={`v${doc.version}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'inherit' }} />
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2.5 }}>
          {details.map(item => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
              <Box sx={{ mt: 0.2, color: 'text.secondary' }}>{item.icon}</Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
              </Box>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
            <Hash size={16} style={{ marginTop: 2 }} />
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="caption" color="text.secondary">SHA-256 Integrity Hash</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {doc.fileHash}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Verified against the stored hash each time the file is downloaded.
              </Typography>
            </Box>
          </Box>
        </Box>
        <Alert severity="info" icon={<Info size={16} />}>
          This document can be downloaded immediately. If no matter is linked, it is treated as an independent file in the archive.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button
          variant="contained"
          startIcon={<Download size={16} />}
          onClick={() => { onDownload(doc.id, doc.originalFilename); onClose(); }}
        >
          Download & Verify
        </Button>
      </DialogActions>
    </Dialog>
  );
};
