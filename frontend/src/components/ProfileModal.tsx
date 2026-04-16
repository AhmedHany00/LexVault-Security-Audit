import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Divider, Avatar, Chip,
  TextField, Alert, CircularProgress,
} from '@mui/material';
import { User, Mail, Shield, Key, Lock, Edit3, Save, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { validatePassword, validateEmail, validateName } from '../utils/validation';
import { sanitizeText } from '../utils/sanitize';
const API = 'http://localhost:3000';
const ROLE_COLOR: Record<string, string> = {
  admin:     '#d32f2f',
  lawyer:    '#1976d2',
  paralegal: '#7b1fa2',
  client:    '#2e7d32',
};
interface ProfileModalProps {
  open:    boolean;
  onClose: () => void;
}
export const ProfileModal = ({ open, onClose }: ProfileModalProps) => {
  const { user, login, logout } = useAuth();
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm,    setInfoForm]    = useState({ firstName: '', lastName: '', email: '' });
  const [infoError,   setInfoError]   = useState('');
  const [infoSuccess, setInfoSuccess] = useState('');
  // ── Password change state ────────────────────────────────────────────────
  const [showPw,    setShowPw]    = useState(false);
  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' });
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  // Account deletion state
  const [showDelAcct,    setShowDelAcct]    = useState(false);
  const [delAcctPw,      setDelAcctPw]      = useState('');
  const [delAcctError,   setDelAcctError]   = useState('');
  const [delAcctLoading, setDelAcctLoading] = useState(false);
  const navigate = useNavigate();
  const role      = user?.role    || '—';
  const uid       = user?.userId  || '—';
  const roleColor = ROLE_COLOR[role] || '#555';
  const displayName  = user?.name  || '';
  const displayEmail = user?.email || '—';
  // Avatar: first letter of name if available, otherwise email
  const avatarInitial = (displayName || displayEmail).charAt(0).toUpperCase();
  // When modal opens, populate edit form from current values
  useEffect(() => {
    if (!open) return;
    const nameParts = displayName.split(' ');
    setInfoForm({
      firstName: nameParts[0] || '',
      lastName:  nameParts.slice(1).join(' ') || '',
      email:     displayEmail === '—' ? '' : displayEmail,
    });
    setInfoError('');
    setInfoSuccess('');
    setEditingInfo(false);
    // Reset delete account state on open
    setShowDelAcct(false);
    setDelAcctPw('');
    setDelAcctError('');
  }, [open]);
  // Save profile info (name/email persisted locally and synced to AuthContext)
  const handleSaveInfo = () => {
    setInfoError('');
    const firstVal = sanitizeText(infoForm.firstName.trim());
    const lastVal  = sanitizeText(infoForm.lastName.trim());
    const emailVal = sanitizeText(infoForm.email.trim());
    // Validate
    if (firstVal) {
      const r = validateName(firstVal, 'First name');
      if (!r.valid) { setInfoError(r.message); return; }
    }
    if (lastVal) {
      const r = validateName(lastVal, 'Last name');
      if (!r.valid) { setInfoError(r.message); return; }
    }
    if (emailVal) {
      const r = validateEmail(emailVal);
      if (!r.valid) { setInfoError(r.message); return; }
    }
    const fullName  = [firstVal, lastVal].filter(Boolean).join(' ') || undefined;
    const newEmail  = emailVal || displayEmail;
    if (fullName && newEmail && newEmail !== '—') {
      try {
        localStorage.setItem(
          `slms_name_${newEmail}`,
          JSON.stringify({ firstName: firstVal, lastName: lastVal })
        );
        const regRaw = localStorage.getItem('slms_user_registry') || '[]';
        const reg: Array<{ email: string; role: string; name?: string }> = JSON.parse(regRaw);
        const idx = reg.findIndex(u => u.email === displayEmail || u.email === newEmail);
        if (idx >= 0) {
          reg[idx] = { ...reg[idx], email: newEmail, name: fullName };
        } else {
          reg.push({ email: newEmail, role, name: fullName });
        }
        localStorage.setItem('slms_user_registry', JSON.stringify(reg));
      } catch {  }
    }
    if (user?.token) {
      login(user.token, role, newEmail, fullName);
    }
    setInfoSuccess('Profile updated successfully.');
    setEditingInfo(false);
  };
  const handlePwChange = async () => {
    setPwError('');
    setPwSuccess('');
    const v = validatePassword(pwForm.next);
    if (!v.valid) { setPwError(v.message); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (!pwForm.current) { setPwError('Current password is required.'); return; }
    setPwLoading(true);
    try {
      await axios.post(
        `${API}/api/auth/change-password`,
        { currentPassword: pwForm.current, newPassword: pwForm.next },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setPwSuccess('Password updated successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      const msg = (axios.isAxiosError(err) && err.response?.data?.message)
        ? err.response.data.message
        : 'Password update requires POST /api/auth/change-password on the server.';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };
  // Account deletion
  const handleDeleteAccount = async () => {
    setDelAcctError('');
    if (!delAcctPw) { setDelAcctError('Password is required to confirm deletion.'); return; }
    setDelAcctLoading(true);
    try {
      await axios.delete(
        `${API}/api/auth/account`,
        {
          data: { password: delAcctPw },
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
      logout();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = (axios.isAxiosError(err) && err.response?.data?.message)
        ? err.response.data.message
        : 'Account deletion failed. Please try again.';
      setDelAcctError(msg);
    } finally {
      setDelAcctLoading(false);
    }
  };
  const handleClose = () => {
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError('');
    setPwSuccess('');
    setShowPw(false);
    setEditingInfo(false);
    setInfoError('');
    setInfoSuccess('');
    onClose();
  };
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <User size={20} />
          My Profile
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: roleColor, fontSize: '1.8rem', mb: 1.5 }}>
            {avatarInitial}
          </Avatar>
          <Typography variant="h6" fontWeight="bold" sx={{ minHeight: 32 }}>
            {displayName || <span style={{ color: '#aaa', fontStyle: 'italic', fontWeight: 400, fontSize: '0.9rem' }}>No name set — edit below</span>}
          </Typography>
          <Chip
            label={role.charAt(0).toUpperCase() + role.slice(1)}
            size="small"
            sx={{ bgcolor: roleColor, color: 'white', fontWeight: 'bold', mt: 0.5 }}
          />
        </Box>
        {}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">Personal Information</Typography>
            {!editingInfo ? (
              <Button size="small" startIcon={<Edit3 size={14} />}
                onClick={() => { setEditingInfo(true); setInfoSuccess(''); setInfoError(''); }}>
                Edit
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" color="inherit" startIcon={<X size={14} />}
                  onClick={() => { setEditingInfo(false); setInfoError(''); }}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" startIcon={<Save size={14} />}
                  onClick={handleSaveInfo}>
                  Save
                </Button>
              </Box>
            )}
          </Box>
          {infoError   && <Alert severity="error"   sx={{ mb: 1.5 }}>{infoError}</Alert>}
          {infoSuccess && <Alert severity="success" sx={{ mb: 1.5 }}>{infoSuccess}</Alert>}
          {editingInfo ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField size="small" fullWidth label="First Name"
                  value={infoForm.firstName}
                  onChange={e => setInfoForm(p => ({ ...p, firstName: e.target.value }))}
                  inputProps={{ maxLength: 50 }}
                />
                <TextField size="small" fullWidth label="Last Name"
                  value={infoForm.lastName}
                  onChange={e => setInfoForm(p => ({ ...p, lastName: e.target.value }))}
                  inputProps={{ maxLength: 50 }}
                />
              </Box>
              <TextField size="small" fullWidth label="Display Email"
                value={infoForm.email}
                onChange={e => setInfoForm(p => ({ ...p, email: e.target.value }))}
                inputProps={{ maxLength: 254 }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f5f7fa', borderRadius: 1 }}>
                <Mail size={18} color="#555" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2" fontWeight="medium">{displayEmail}</Typography>
                </Box>
              </Box>
              {}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f5f7fa', borderRadius: 1 }}>
                <Shield size={18} color="#555" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Role</Typography>
                  <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>{role}</Typography>
                </Box>
              </Box>
              {}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f5f7fa', borderRadius: 1 }}>
                <Key size={18} color="#555" />
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="caption" color="text.secondary">User ID</Typography>
                  <Typography variant="body2" fontWeight="medium"
                    sx={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                    {uid}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {}
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: 1 }}
            onClick={() => setShowPw(v => !v)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock size={16} />
              <Typography variant="subtitle2" fontWeight="bold">Change Password</Typography>
            </Box>
            <Typography variant="caption" color="primary">{showPw ? 'Hide' : 'Show'}</Typography>
          </Box>
          {showPw && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {pwError   && <Alert severity="error"   sx={{ mb: 1 }}>{pwError}</Alert>}
              {pwSuccess && <Alert severity="success" sx={{ mb: 1 }}>{pwSuccess}</Alert>}
              <TextField size="small" fullWidth type="password" label="Current Password"
                value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                inputProps={{ maxLength: 128 }} sx={{ mb: 1 }}
              />
              <TextField size="small" fullWidth type="password" label="New Password"
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                inputProps={{ maxLength: 128 }}
              />
              <PasswordStrengthMeter password={pwForm.next} />
              <TextField size="small" fullWidth type="password" label="Confirm New Password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                inputProps={{ maxLength: 128 }} sx={{ mt: 0.5 }}
              />
              <Button variant="contained" size="small" sx={{ mt: 1.5 }}
                onClick={handlePwChange} disabled={pwLoading}>
                {pwLoading ? <CircularProgress size={18} /> : 'Update Password'}
              </Button>
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {}
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: 1 }}
            onClick={() => setShowDelAcct(v => !v)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Trash2 size={16} color="#d32f2f" />
              <Typography variant="subtitle2" fontWeight="bold" color="error">Delete Account</Typography>
            </Box>
            <Typography variant="caption" color="error">{showDelAcct ? 'Hide' : 'Show'}</Typography>
          </Box>
          {showDelAcct && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Alert severity="error" sx={{ mb: 1 }}>
                This will permanently delete your account and all documents you uploaded. This action cannot be undone.
              </Alert>
              {delAcctError && <Alert severity="error" sx={{ mb: 1 }}>{delAcctError}</Alert>}
              <TextField size="small" fullWidth type="password" label="Enter your password to confirm"
                value={delAcctPw}
                onChange={e => { setDelAcctPw(e.target.value); setDelAcctError(''); }}
                inputProps={{ maxLength: 128 }}
              />
              <Button variant="contained" color="error" size="small" sx={{ mt: 0.5 }}
                onClick={handleDeleteAccount} disabled={delAcctLoading}>
                {delAcctLoading ? <CircularProgress size={18} /> : 'Confirm — Delete My Account'}
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};
