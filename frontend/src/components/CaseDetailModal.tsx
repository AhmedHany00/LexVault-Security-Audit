import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Divider, Chip, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem, Select, InputLabel, FormControl,
  Alert, Tooltip, Grid, IconButton, Autocomplete,
} from '@mui/material';
import {
  Briefcase, FileText, Download, Edit3, X, Save,
  User, Calendar, Hash, Link2, Unlink,
} from 'lucide-react';
const API = 'http://localhost:3000';
export type { LegalUser, LegalCase, LegalDocument } from '../types';
import type { LegalUser, LegalCase, LegalDocument } from '../types';
const STATUS_OPTIONS = ['Pending', 'Active', 'Closed'];
const statusColor = (
  s: string
): 'default' | 'warning' | 'success' | 'error' => {
  if (s === 'Active')  return 'success';
  if (s === 'Pending') return 'warning';
  if (s === 'Closed')  return 'error';
  return 'default';
};
interface CaseDetailModalProps {
  open:          boolean;
  caseData:      LegalCase | null;
  token:         string;
  userRole:      string;
  userId:        string;
    knownLawyers:  LegalUser[];
    knownClients:  LegalUser[];
    allDocuments:  LegalDocument[];
  onClose:       () => void;
  onCaseUpdated: () => void;
}
export const CaseDetailModal = ({
  open, caseData, token, userRole, userId,
  knownLawyers, knownClients, allDocuments,
  onClose, onCaseUpdated,
}: CaseDetailModalProps) => {
  const [caseDocuments, setCaseDocuments] = useState<LegalDocument[]>([]);
  const [docsLoading,   setDocsLoading]   = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [saveLoading,   setSaveLoading]   = useState(false);
  const [saveError,     setSaveError]     = useState('');
  const [dlError,       setDlError]       = useState('');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  // ── Edit form state ──────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    title:       '',
    description: '',
    status:      '',
    lawyerId:    '',
    clientId:    '',
  });
  // Documents to attach/detach — tracked locally until Save is clicked
  const [pendingAttach, setPendingAttach] = useState<LegalDocument[]>([]);
  const [pendingDetach, setPendingDetach] = useState<string[]>([]); // doc ids to detach
  // ── Access control ───────────────────────────────────────────────────────
  const isAdmin  = userRole === 'admin';
  const canEdit  =
    isAdmin ||
    (userRole === 'lawyer' && caseData?.assignedLawyer?.id === userId);
  const fetchCaseDocs = useCallback(async () => {
    if (!caseData) return;
    setDocsLoading(true);
    try {
      const res = await axios.get(
        `${API}/api/documents?caseId=${caseData.id}`,
        authHeader
      );
      setCaseDocuments(res.data.documents || []);
    } catch {
    } finally {
      setDocsLoading(false);
    }
  }, [caseData?.id, token]);
  useEffect(() => {
    if (!open || !caseData) return;
    setEditing(false);
    setSaveError('');
    setDlError('');
    setPendingAttach([]);
    setPendingDetach([]);
    fetchCaseDocs();
  }, [open, caseData?.id]);
  // ── Enter edit mode ──────────────────────────────────────────────────────
  const enterEditMode = () => {
    if (!caseData) return;
    setEditForm({
      title:       caseData.title,
      description: caseData.description || '',
      status:      caseData.status,
      lawyerId:    caseData.assignedLawyer?.id || '',
      clientId:    caseData.client?.id || '',
    });
    setPendingAttach([]);
    setPendingDetach([]);
    setSaveError('');
    setEditing(true);
  };
  // ── Document pending attach/detach ───────────────────────────────────────
  // Documents currently shown as "attached" during editing
  // = (original docs) minus (pending detach) plus (pending attach)
  const effectiveDocs = editing
    ? [
        ...caseDocuments.filter(d => !pendingDetach.includes(d.id)),
        ...pendingAttach,
      ]
    : caseDocuments;
  // Documents available to attach = all docs not currently effective
  const attachableDocuments = allDocuments.filter(
    d => !effectiveDocs.some(ed => ed.id === d.id)
  );
  const handleAddDoc = (doc: LegalDocument | null) => {
    if (!doc) return;
    setPendingAttach(prev => [...prev, doc]);
  };
  const handleRemoveDoc = (docId: string, isNew: boolean) => {
    if (isNew) {
      setPendingAttach(prev => prev.filter(d => d.id !== docId));
    } else {
      setPendingDetach(prev => [...prev, docId]);
    }
  };
  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!caseData) return;
    setSaveError('');
    setSaveLoading(true);
    try {
      // Persist the edited case and any document link changes
      await axios.put(`${API}/api/cases/${caseData.id}`, {
        title:       editForm.title,
        description: editForm.description,
        status:      editForm.status,
        ...(isAdmin && editForm.lawyerId ? { lawyerId: editForm.lawyerId } : {}),
        ...((isAdmin || userRole === 'lawyer') && editForm.clientId ? { clientId: editForm.clientId } : {}),
        attachDocumentIds: pendingAttach.map(d => d.id),
        detachDocumentIds: pendingDetach,
      }, authHeader);
      setEditing(false);
      setPendingAttach([]);
      setPendingDetach([]);
      onCaseUpdated();
    } catch (err: unknown) {
      const msg = (axios.isAxiosError(err) && err.response?.data?.message)
        ? err.response.data.message
        : 'Failed to update case.';
      setSaveError(msg);
    } finally {
      setSaveLoading(false);
    }
  };
  const handleDownload = async (docId: string, filename: string) => {
    setDlError('');
    try {
      const res = await axios.get(`${API}/api/documents/${docId}`, {
        ...authHeader,
        responseType: 'blob',
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setDlError('⚠ SECURITY ALERT: Integrity check failed — document may have been tampered with.');
      } else {
        setDlError('Download failed. Please try again.');
      }
    }
  };
  const handleClose = () => {
    setEditing(false);
    setSaveError('');
    setDlError('');
    setPendingAttach([]);
    setPendingDetach([]);
    onClose();
  };
  if (!caseData) return null;
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Briefcase size={20} />
            <Typography variant="h6" fontWeight="bold">
              {editing ? 'Edit Case' : 'Case Details'}
            </Typography>
            <Chip
              label={<code style={{ fontSize: '0.78rem' }}>{caseData.caseNumber}</code>}
              size="small" variant="outlined"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canEdit && !editing && (
              <Button size="small" startIcon={<Edit3 size={14} />} onClick={enterEditMode}>
                Edit
              </Button>
            )}
            {editing && (
              <Button size="small" color="inherit" startIcon={<X size={14} />}
                onClick={() => { setEditing(false); setSaveError(''); }}>
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        {dlError && (
          <Alert severity="error" onClose={() => setDlError('')} sx={{ mb: 2 }}>
            {dlError}
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" onClose={() => setSaveError('')} sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            {editing ? (
              <TextField fullWidth label="Case Title *" size="small"
                value={editForm.title}
                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                inputProps={{ maxLength: 200 }}
              />
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary">Title</Typography>
                <Typography variant="h6" fontWeight="bold">{caseData.title}</Typography>
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {editing ? (
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={editForm.status} label="Status"
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={caseData.status} color={statusColor(caseData.status)} size="small" />
                </Box>
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12 }}>
            {editing ? (
              <TextField fullWidth multiline rows={3} label="Description" size="small"
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                inputProps={{ maxLength: 1000 }}
              />
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {caseData.description || <em style={{ color: '#aaa' }}>No description.</em>}
                </Typography>
              </Box>
            )}
          </Grid>
          {}
          <Grid size={{ xs: 12, sm: 6 }}>
            {editing && isAdmin ? (
              <FormControl fullWidth size="small">
                <InputLabel>Assigned Lawyer</InputLabel>
                <Select value={editForm.lawyerId} label="Assigned Lawyer"
                  onChange={e => setEditForm(p => ({ ...p, lawyerId: e.target.value }))}>
                  <MenuItem value=""><em>Unassigned</em></MenuItem>
                  {knownLawyers.map(l => (
                    <MenuItem key={l.id} value={l.id}>
                      {(l.firstName || l.lastName)
                        ? `${l.firstName} ${l.lastName}`.trim() + ` — ${l.email}`
                        : l.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <User size={16} color="#555" style={{ marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Assigned Lawyer</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {caseData.assignedLawyer
                      ? `${caseData.assignedLawyer.firstName} ${caseData.assignedLawyer.lastName}`
                      : <em style={{ color: '#aaa' }}>Unassigned</em>}
                  </Typography>
                  {caseData.assignedLawyer?.email && (
                    <Typography variant="caption" color="text.secondary">
                      {caseData.assignedLawyer.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Grid>
          {}
          <Grid size={{ xs: 12, sm: 6 }}>
            {editing && (isAdmin || userRole === 'lawyer') ? (
              <FormControl fullWidth size="small">
                <InputLabel>Client</InputLabel>
                <Select value={editForm.clientId} label="Client"
                  onChange={e => setEditForm(p => ({ ...p, clientId: e.target.value }))}>
                  <MenuItem value=""><em>No client assigned</em></MenuItem>
                  {knownClients.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {(c.firstName || c.lastName)
                        ? `${c.firstName} ${c.lastName}`.trim() + ` — ${c.email}`
                        : c.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <User size={16} color="#555" style={{ marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Client</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {caseData.client
                      ? `${caseData.client.firstName} ${caseData.client.lastName}`
                      : <em style={{ color: '#aaa' }}>No client assigned</em>}
                  </Typography>
                  {caseData.client?.email && (
                    <Typography variant="caption" color="text.secondary">
                      {caseData.client.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Grid>
          {}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar size={14} color="#888" />
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(caseData.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ mb: 2 }} />
        {}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText size={18} />
              <Typography variant="subtitle1" fontWeight="bold">Attached Documents</Typography>
              <Chip label={effectiveDocs.length} size="small" variant="outlined" />
            </Box>
          </Box>
          {}
          {editing && (
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                size="small"
                options={attachableDocuments}
                getOptionLabel={d => `${d.title} (${d.originalFilename})`}
                onChange={(_, v) => handleAddDoc(v)}
                renderInput={params => (
                  <TextField {...params} label="Attach a document to this case"
                    placeholder="Type to search available documents…" />
                )}
                noOptionsText={
                  allDocuments.length === 0
                    ? 'No documents uploaded yet'
                    : 'All available documents are already attached'
                }
              />
              {allDocuments.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }} icon={<FileText size={15} />}>
                  Upload documents from the Documents tab first, then attach them here.
                </Alert>
              )}
            </Box>
          )}
          {docsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : effectiveDocs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <FileText size={32} color="#ccc" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No documents attached to this case.
                {editing ? ' Use the search above to attach one.' : ''}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Title</strong></TableCell>
                    <TableCell><strong>Filename</strong></TableCell>
                    <TableCell><strong>SHA-256</strong></TableCell>
                    <TableCell><strong>Ver.</strong></TableCell>
                    <TableCell align="center"><strong>
                      {editing ? 'Actions' : 'Download'}
                    </strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {effectiveDocs.map(d => {
                    const isNew      = pendingAttach.some(pa => pa.id === d.id);
                    const isRemoving = pendingDetach.includes(d.id);
                    return (
                      <TableRow key={d.id}
                        sx={{
                          opacity: isRemoving ? 0.4 : 1,
                          bgcolor: isNew ? '#f0fff0' : 'inherit',
                        }}>
                        <TableCell>
                          <strong>{d.title}</strong>
                          {isNew && (
                            <Chip label="New" size="small" color="success"
                              sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{d.originalFilename}</TableCell>
                        <TableCell>
                          <Tooltip title={d.fileHash} arrow>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                              <Hash size={12} color="#888" />
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>
                                {d.fileHash.slice(0, 12)}…
                              </Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip label={`v${d.version}`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {!editing && (
                              <Tooltip title="Download & verify SHA-256">
                                <IconButton size="small"
                                  onClick={() => handleDownload(d.id, d.originalFilename)}>
                                  <Download size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {editing && !isRemoving && (
                              <>
                                <Tooltip title="Download">
                                  <IconButton size="small"
                                    onClick={() => handleDownload(d.id, d.originalFilename)}>
                                    <Download size={15} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={isNew ? 'Cancel attach' : 'Detach from case'}>
                                  <IconButton size="small" color="error"
                                    onClick={() => handleRemoveDoc(d.id, isNew)}>
                                    <Unlink size={15} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {editing && isRemoving && (
                              <Tooltip title="Undo detach">
                                <IconButton size="small" color="warning"
                                  onClick={() => setPendingDetach(prev => prev.filter(id => id !== d.id))}>
                                  <Link2 size={15} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
          {}
          {editing && (pendingAttach.length > 0 || pendingDetach.length > 0) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Pending: {pendingAttach.length > 0 && `${pendingAttach.length} to attach`}
              {pendingAttach.length > 0 && pendingDetach.length > 0 && ', '}
              {pendingDetach.length > 0 && `${pendingDetach.length} to detach`}
              {' '}— click Save Changes to apply.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {editing ? (
          <>
            <Button onClick={() => { setEditing(false); setSaveError(''); }}>Cancel</Button>
            <Button variant="contained"
              startIcon={saveLoading ? <CircularProgress size={16} /> : <Save size={16} />}
              onClick={handleSave}
              disabled={saveLoading || !editForm.title}>
              Save Changes
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} variant="outlined">Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
