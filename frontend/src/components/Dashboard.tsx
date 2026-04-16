import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container, Typography, Box, Button, Paper,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableRow, TableCell, TableBody, Chip,
  Alert, CircularProgress, Divider, MenuItem, Select,
  InputLabel, FormControl, Tabs, Tab, Snackbar,
  Tooltip, Avatar, Menu, IconButton,
} from '@mui/material';
import {
  LogOut, Plus, Briefcase, FileText, RefreshCw,
  Download, ShieldCheck, AlertTriangle, Clock,
  ChevronRight, Hash, UploadCloud, UserCircle, Trash2,
} from 'lucide-react';
import { useAuth }   from '../context/AuthContext';
import { parseJwt }  from '../context/AuthContext';
import { sanitizeText, sanitizeFormData } from '../utils/sanitize';
import { validateTitle, validateFile, generateCaseNumber } from '../utils/validation';
import { CaseDetailModal }   from './CaseDetailModal';
import { DocumentViewModal } from './DocumentViewModal';
import { ProfileModal }      from './ProfileModal';
import type { LegalCase, LegalUser, LegalDocument } from '../types';
const API = 'http://localhost:3000';
const WARN_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
const statusColor = (s: string): 'default' | 'warning' | 'success' | 'error' => {
  if (s === 'Active')  return 'success';
  if (s === 'Pending') return 'warning';
  if (s === 'Closed')  return 'error';
  return 'default';
};
const ROLE_COLOR: Record<string, string> = {
  admin: '#d32f2f', lawyer: '#1565c0', paralegal: '#6a1b9a', client: '#2e7d32',
};
export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const token  = user?.token  || '';
  const role   = user?.role   || '';
  const userId = user?.userId || '';
  const email  = user?.email  || '';
  const authHeader = useCallback(() => ({
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);
  // ── Core state ─────────────────────────────────────────────────────────────
  const [tab,       setTab]       = useState(0);
  const [cases,     setCases]     = useState<LegalCase[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [snack,     setSnack]     = useState('');
  // ── Session expiry ─────────────────────────────────────────────────────────
  const [showExpiryWarn, setShowExpiryWarn] = useState(false);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Profile menu ───────────────────────────────────────────────────────────
  const [anchorEl,    setAnchorEl]    = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  // ── Case detail modal ──────────────────────────────────────────────────────
  const [selectedCase,   setSelectedCase]   = useState<LegalCase | null>(null);
  const [caseDetailOpen, setCaseDetailOpen] = useState(false);
  // ── Document view modal ────────────────────────────────────────────────────
  const [selectedDoc,   setSelectedDoc]   = useState<LegalDocument | null>(null);
  const [docViewOpen,   setDocViewOpen]   = useState(false);
  // ── Create case dialog ─────────────────────────────────────────────────────
  const [openCase,    setOpenCase]    = useState(false);
  const [caseNumber,  setCaseNumber]  = useState('');
  const [caseForm,    setCaseForm]    = useState({ title: '', description: '', clientId: '', lawyerId: '' });
  const [caseError,   setCaseError]   = useState('');
  const [caseLoading, setCaseLoading] = useState(false);
  // ── Upload document dialog ─────────────────────────────────────────────────
  const [openDoc,    setOpenDoc]    = useState(false);
  const [docForm,    setDocForm]    = useState({ title: '', caseId: '' });
  const [docFile,    setDocFile]    = useState<File | null>(null);
  const [docError,   setDocError]   = useState('');
  const [docLoading, setDocLoading] = useState(false);
  // Document filter
  const [docCaseFilter, setDocCaseFilter] = useState('');
  // Known users list
  const [knownClients, setKnownClients] = useState<LegalUser[]>([]);
  const [knownLawyers, setKnownLawyers] = useState<LegalUser[]>([]);
  // Document delete confirmation (admin only)
  const [deleteDocId,   setDeleteDocId]   = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/cases`, authHeader());
      setCases(res.data.cases || []);
    } catch {
      setError('Failed to load cases.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);
  const fetchUsers = useCallback(async () => {
    if (!['admin', 'lawyer'].includes(role)) {
      setKnownClients([]);
      setKnownLawyers([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/api/users`, authHeader());
      const users: LegalUser[] = res.data.users || [];
      setKnownClients(users.filter(u => u.role === 'client'));
      setKnownLawyers(users.filter(u => u.role === 'lawyer'));
    } catch {
      setKnownClients([]);
      setKnownLawyers([]);
    }
  }, [authHeader, role]);
  const fetchDocuments = useCallback(async (caseId?: string) => {
    try {
      const url = caseId ? `${API}/api/documents?caseId=${caseId}` : `${API}/api/documents`;
      const res = await axios.get(url, authHeader());
      setDocuments(res.data.documents || []);
    } catch {  }
  }, [authHeader]);
  useEffect(() => {
    fetchUsers();
    fetchCases();
    fetchDocuments();
    const payload = parseJwt(token);
    if (payload?.exp) {
      const delay = payload.exp * 1000 - Date.now() - WARN_BEFORE_EXPIRY_MS;
      if (delay > 0) expiryTimer.current = setTimeout(() => setShowExpiryWarn(true), delay);
    }
    return () => { if (expiryTimer.current) clearTimeout(expiryTimer.current); };
  }, [fetchCases, fetchDocuments, fetchUsers, token]);
  useEffect(() => {
    fetchDocuments(docCaseFilter || undefined);
  }, [docCaseFilter, fetchDocuments]);
  const openCreateCaseDialog = () => {
    setCaseNumber(generateCaseNumber());
    setCaseForm({ title: '', description: '', clientId: '', lawyerId: '' });
    setCaseError('');
    setOpenCase(true);
  };
  const handleCreateCase = async () => {
    const v = validateTitle(caseForm.title, 'Case title');
    if (!v.valid) { setCaseError(v.message); return; }
    setCaseError('');
    setCaseLoading(true);
    try {
      const payload: Record<string, string> = {
        ...sanitizeFormData({ title: caseForm.title, description: caseForm.description }),
        caseNumber,
      };
      if (caseForm.clientId)  payload.clientId  = caseForm.clientId;
      if (caseForm.lawyerId)  payload.lawyerId  = caseForm.lawyerId;
      await axios.post(`${API}/api/cases`, payload, authHeader());
      setOpenCase(false);
      setSnack('Case created successfully.');
      fetchCases();
    } catch (err: unknown) {
      setCaseError((axios.isAxiosError(err) && err.response?.data?.message) || 'Failed to create case.');
    } finally {
      setCaseLoading(false);
    }
  };
  // ─── Upload document ─────────────────────────────────────────────────────
  const openUploadDialog = () => {
    setDocForm({ title: '', caseId: docCaseFilter || '' });
    setDocFile(null);
    setDocError('');
    setOpenDoc(true);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocError('');
    if (file) {
      const v = validateFile(file);
      if (!v.valid) { setDocError(v.message); return; }
    }
    setDocFile(file);
  };
  const handleUploadDoc = async () => {
    if (!docFile) { setDocError('Please select a file.'); return; }
    setDocError('');
    setDocLoading(true);
    try {
      const fd = new FormData();
      fd.append('document', docFile);
      fd.append('title', sanitizeText(docForm.title || docFile.name));
      if (docForm.caseId) fd.append('caseId', docForm.caseId);
      await axios.post(`${API}/api/documents/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setOpenDoc(false);
      setSnack(docForm.caseId ? 'Document uploaded and linked successfully.' : 'Document uploaded as an independent document.');
      fetchDocuments(docCaseFilter || undefined);
    } catch (err: unknown) {
      setDocError((axios.isAxiosError(err) && err.response?.data?.message) || 'Upload failed.');
    } finally {
      setDocLoading(false);
    }
  };
  const handleDownload = async (docId: string, filename: string) => {
    try {
      const res = await axios.get(`${API}/api/documents/${docId}`, {
        ...authHeader(), responseType: 'blob',
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSnack('Download complete — SHA-256 integrity verified.');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403)
        setError('⚠ SECURITY ALERT: File integrity check failed — document may have been tampered with!');
      else
        setError('Download failed. Please try again.');
    }
  };
  const handleLogout = () => { logout(); navigate('/'); };
  const handleDeleteDoc = async (docId: string) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/api/documents/${docId}`, authHeader());
      setDeleteDocId(null);
      setSnack('Document deleted successfully.');
      fetchDocuments(docCaseFilter || undefined);
    } catch (err: unknown) {
      setError((axios.isAxiosError(err) && err.response?.data?.message) || 'Failed to delete document.');
      setDeleteDocId(null);
    } finally {
      setDeleteLoading(false);
    }
  };
  const canCreateCase = ['admin', 'lawyer'].includes(role);
  const isClient      = role === 'client';
  const isLawyer      = role === 'lawyer';
  const isAdmin       = role === 'admin';
  const avatarInitial = (user?.name || user?.email || role).charAt(0).toUpperCase();
  const stats = [
    { label: 'Total Cases',  value: cases.length,                                    color: '#b08d57' },
    { label: 'Active Cases', value: cases.filter(c => c.status === 'Active').length, color: '#2e7d32' },
    ...(!isClient ? [{ label: 'Documents', value: documents.length, color: '#0f1f33' }] : []),
  ];
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {}
      <Box sx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        px: { xs: 2, md: 4 }, py: 1.8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 12px 30px rgba(15,31,51,0.18)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShieldCheck size={24} />
          <Typography variant="h6" fontWeight="bold">Secure Legal Portal</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip label={role} size="small" sx={{
            bgcolor: 'rgba(255,255,255,0.2)', color: 'white',
            fontWeight: 'bold', textTransform: 'capitalize',
          }} />
          {}
          <Tooltip title="My Profile">
            <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{
                width: 34, height: 34, fontSize: '0.9rem', fontWeight: 'bold',
                bgcolor: ROLE_COLOR[role] || '#555',
              }}>
                {avatarInitial}
              </Avatar>
            </IconButton>
          </Tooltip>
          {}
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
            <Box sx={{ px: 2, py: 1, minWidth: 190 }}>
              <Typography variant="caption" color="text.secondary">Signed in as</Typography>
              {user?.name && (
                <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 165 }}>
                  {user.name}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 165, display: 'block' }}>
                {email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); setProfileOpen(true); }}>
              <UserCircle size={16} style={{ marginRight: 8 }} /> My Profile
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }}>
              <LogOut size={16} style={{ marginRight: 8 }} /> Sign Out
            </MenuItem>
          </Menu>
          <Button variant="outlined" size="small" color="inherit"
            onClick={handleLogout} startIcon={<LogOut size={15} />}>
            Logout
          </Button>
        </Box>
      </Box>
      <Container maxWidth="xl" sx={{ mt: 3, pb: 6 }}>
        {showExpiryWarn && (
          <Alert severity="warning" icon={<Clock size={18} />}
            onClose={() => setShowExpiryWarn(false)} sx={{ mb: 2 }}>
            Your session expires in 5 minutes. Save your work and log in again to continue.
          </Alert>
        )}
        {}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <Paper key={s.label} sx={{
              p: 2.5, flex: '1 1 160px',
              borderLeft: `5px solid ${s.color}`,
            }}>
              <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
              <Typography variant="body2" color="text.secondary">{s.label}</Typography>
            </Paper>
          ))}
        </Box>
        {error && (
          <Alert severity="error" icon={<AlertTriangle size={18} />}
            onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {}
          <Box sx={{
            borderBottom: 1, borderColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2, py: 0.5, flexWrap: 'wrap', gap: 1,
          }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Cases"     icon={<Briefcase size={15} />} iconPosition="start" />
              {!isClient && <Tab label="Documents" icon={<FileText  size={15} />} iconPosition="start" />}
            </Tabs>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {tab === 0 && canCreateCase && (
                <Button size="small" variant="contained"
                  startIcon={<Plus size={15} />}
                  onClick={openCreateCaseDialog}>
                  New Case
                </Button>
              )}
              {tab === 1 && (
                <>
                  <FormControl size="small" sx={{ minWidth: 190 }}>
                    <Select displayEmpty value={docCaseFilter}
                      onChange={e => setDocCaseFilter(e.target.value)}>
                      <MenuItem value="">All Documents</MenuItem>
                      {cases.map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.caseNumber} — {c.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button size="small" variant="contained"
                    startIcon={<UploadCloud size={15} />}
                    onClick={openUploadDialog}>
                    Upload Document
                  </Button>
                </>
              )}
              <Button size="small"
                onClick={() => { fetchCases(); fetchDocuments(docCaseFilter || undefined); }}
                startIcon={<RefreshCw size={13} />}>
                Refresh
              </Button>
            </Box>
          </Box>
          {}
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : cases.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Briefcase size={48} color="#ccc" />
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    No cases yet.{canCreateCase ? ' Click "New Case" to get started.' : ''}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Case #</strong></TableCell>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        {}
                        {!isLawyer && <TableCell><strong>{isClient ? 'Your Lawyer' : 'Assigned Lawyer'}</strong></TableCell>}
                        {}
                        {!isClient && <TableCell><strong>Client</strong></TableCell>}
                        <TableCell><strong>Created</strong></TableCell>
                        <TableCell align="center"><strong>Details</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cases.map(c => {
                        const canEditThis =
                          role === 'admin' ||
                          (role === 'lawyer' && c.assignedLawyer?.id === userId);
                        return (
                          <TableRow key={c.id} hover sx={{ cursor: 'pointer' }}
                            onClick={() => { setSelectedCase(c); setCaseDetailOpen(true); }}>
                            <TableCell>
                              <code style={{ fontSize: '0.78rem' }}>{c.caseNumber}</code>
                            </TableCell>
                            <TableCell>
                              <strong>{c.title}</strong>
                              {canEditThis && (
                                <Chip label="Editable" size="small" color="info"
                                  sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={c.status} color={statusColor(c.status)} size="small" />
                            </TableCell>
                            {!isLawyer && (
                              <TableCell sx={{ fontSize: '0.82rem' }}>
                                {c.assignedLawyer
                                  ? `${c.assignedLawyer.firstName} ${c.assignedLawyer.lastName}`
                                  : <em style={{ color: '#bbb' }}>Unassigned</em>}
                              </TableCell>
                            )}
                            {!isClient && (
                              <TableCell sx={{ fontSize: '0.82rem' }}>
                                {c.client
                                  ? `${c.client.firstName} ${c.client.lastName}`
                                  : <em style={{ color: '#bbb' }}>—</em>}
                              </TableCell>
                            )}
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="View details & attached documents">
                                <ChevronRight size={18} color="#1976d2" />
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
          {}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              {docCaseFilter && (
                <Alert severity="info" sx={{ mb: 2 }} icon={<Briefcase size={15} />}
                  onClose={() => setDocCaseFilter('')}>
                  Filtered by case: <strong>
                    {cases.find(c => c.id === docCaseFilter)?.caseNumber} —{' '}
                    {cases.find(c => c.id === docCaseFilter)?.title}
                  </strong>
                </Alert>
              )}
              {documents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <FileText size={48} color="#ccc" />
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    {docCaseFilter
                      ? 'No documents attached to this matter yet.'
                      : 'No documents yet. You can upload an independent document or link it to a matter.'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Filename</strong></TableCell>
                        <TableCell><strong>Linked Case</strong></TableCell>
                        <TableCell><strong>SHA-256 Hash</strong></TableCell>
                        <TableCell><strong>Ver.</strong></TableCell>
                        <TableCell><strong>Uploaded</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documents.map(d => {
                        const linkedCase = d.case
                          ?? (docCaseFilter ? cases.find(c => c.id === docCaseFilter) : undefined);
                        return (
                          <TableRow key={d.id} hover sx={{ cursor: 'pointer' }}
                            onClick={() => { setSelectedDoc(d); setDocViewOpen(true); }}>
                            <TableCell><strong>{d.title}</strong></TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{d.originalFilename}</TableCell>
                            <TableCell>
                              {linkedCase
                                ? (
                                  <Tooltip title={linkedCase.title} arrow>
                                    <Chip label={linkedCase.caseNumber} size="small" variant="outlined" />
                                  </Tooltip>
                                )
                                : <em style={{ color: '#bbb', fontSize: '0.8rem' }}>—</em>}
                            </TableCell>
                            <TableCell>
                              <Tooltip title={d.fileHash} arrow>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                                  <Hash size={12} color="#888" />
                                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#555' }}>
                                    {d.fileHash.slice(0, 14)}…
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip label={`v${d.version}`} size="small" />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {new Date(d.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <Tooltip title="View document details">
                                  <Button size="small" color="info"
                                    onClick={e => { e.stopPropagation(); setSelectedDoc(d); setDocViewOpen(true); }}>
                                    <FileText size={16} />
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Download & verify SHA-256 integrity">
                                  <Button size="small" color="primary"
                                    onClick={e => { e.stopPropagation(); handleDownload(d.id, d.originalFilename); }}>
                                    <Download size={16} />
                                  </Button>
                                </Tooltip>
                                {isAdmin && (
                                  <Tooltip title="Delete document (admin only)">
                                    <IconButton size="small" color="error"
                                      onClick={e => { e.stopPropagation(); setDeleteDocId(d.id); }}>
                                      <Trash2 size={15} />
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
            </Box>
          )}
        </Paper>
      </Container>
      {}
      <Dialog open={openCase} onClose={() => setOpenCase(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Briefcase size={18} /> Create New Case
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {caseError && <Alert severity="error" sx={{ mb: 2 }}>{caseError}</Alert>}
          {}
          <TextField fullWidth label="Case Serial (System-generated)" value={caseNumber}
            InputProps={{ readOnly: true }}
            sx={{ mb: 2, '& input': { fontFamily: 'monospace', fontWeight: 'bold', color: '#1976d2' } }}
          />
          <TextField fullWidth required label="Case Title" value={caseForm.title}
            onChange={e => { setCaseForm(p => ({ ...p, title: e.target.value })); setCaseError(''); }}
            sx={{ mb: 2 }} inputProps={{ maxLength: 200 }}
          />
          <TextField fullWidth multiline rows={3} label="Description (optional)"
            value={caseForm.description}
            onChange={e => setCaseForm(p => ({ ...p, description: e.target.value }))}
            sx={{ mb: 2 }} inputProps={{ maxLength: 1000 }}
          />
          <FormControl fullWidth sx={{ mb: 0.5 }}>
            <InputLabel>Assign Client (optional)</InputLabel>
            <Select value={caseForm.clientId} label="Assign Client (optional)"
              onChange={e => setCaseForm(p => ({ ...p, clientId: e.target.value }))}>
              <MenuItem value=""><em>No client (company / unassigned)</em></MenuItem>
              {knownClients.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {(c.firstName || c.lastName) ? (`${c.firstName} ${c.lastName}`.trim() + ` — ${c.email}`) : c.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            {knownClients.length === 0
              ? 'No client records were returned yet. Clients must register an account before they can be assigned.'
              : `${knownClients.length} client account(s) available.`}
          </Typography>
          {isAdmin && (
            <FormControl fullWidth sx={{ mt: 2, mb: 0.5 }}>
              <InputLabel>Assign Lawyer (optional)</InputLabel>
              <Select value={caseForm.lawyerId} label="Assign Lawyer (optional)"
                onChange={e => setCaseForm(p => ({ ...p, lawyerId: e.target.value }))}>
                <MenuItem value=""><em>No lawyer assigned yet</em></MenuItem>
                {knownLawyers.map(l => (
                  <MenuItem key={l.id} value={l.id}>
                    {(l.firstName || l.lastName)
                      ? `${l.firstName} ${l.lastName}`.trim() + ` — ${l.email}`
                      : l.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {isAdmin && knownLawyers.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              No lawyer records returned yet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCase(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCase}
            disabled={caseLoading || !caseForm.title}>
            {caseLoading ? <CircularProgress size={20} /> : 'Create Case'}
          </Button>
        </DialogActions>
      </Dialog>
      {}
      <Dialog open={openDoc} onClose={() => setOpenDoc(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadCloud size={18} /> Upload Secure Document
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {docError && <Alert severity="error" sx={{ mb: 2 }}>{docError}</Alert>}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Link to Matter (optional)</InputLabel>
            <Select value={docForm.caseId} label="Link to Matter (optional)"
              onChange={e => setDocForm(p => ({ ...p, caseId: e.target.value as string }))}>
              <MenuItem value=""><em>Independent document</em></MenuItem>
              {cases.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.caseNumber} — {c.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mb: 2 }} icon={<FileText size={15} />}>
            Documents can now be uploaded with or without a linked matter.
            Independent documents remain searchable and downloadable.
          </Alert>
          <TextField fullWidth label="Document Title (optional)" value={docForm.title}
            onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))}
            sx={{ mb: 2 }} inputProps={{ maxLength: 200 }}
          />
          <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
            {docFile ? `📎 ${docFile.name}` : 'Choose File (PDF, DOCX, TXT, JPEG, PNG — max 10 MB)'}
            <input type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              hidden onChange={handleFileChange} />
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            File will be SHA-256 hashed on upload for integrity verification.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDoc(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleUploadDoc}
            disabled={docLoading || !docFile || !!docError}>
            {docLoading ? <CircularProgress size={20} /> : 'Upload & Secure'}
          </Button>
        </DialogActions>
      </Dialog>
      {}
      <DocumentViewModal
        open={docViewOpen}
        doc={selectedDoc}
        cases={cases}
        onClose={() => { setDocViewOpen(false); setSelectedDoc(null); }}
        onDownload={handleDownload}
      />
      {}
      <CaseDetailModal
        open={caseDetailOpen}
        caseData={selectedCase}
        token={token}
        userRole={role}
        userId={userId}
        knownLawyers={knownLawyers}
        knownClients={knownClients}
        allDocuments={documents}
        onClose={() => { setCaseDetailOpen(false); setSelectedCase(null); }}
        onCaseUpdated={() => { fetchCases(); fetchDocuments(docCaseFilter || undefined); setSnack('Case updated.'); setCaseDetailOpen(false); }}
      />
      {}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {}
      <Dialog open={!!deleteDocId} onClose={() => setDeleteDocId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={18} /> Confirm Deletion
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently remove the document and its file. This cannot be undone.
          </Alert>
          <Typography variant="body2">Are you sure you want to delete this document?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDocId(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleteLoading}
            onClick={() => deleteDocId && handleDeleteDoc(deleteDocId)}>
            {deleteLoading ? <CircularProgress size={18} /> : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
      {}
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
    </Box>
  );
};
