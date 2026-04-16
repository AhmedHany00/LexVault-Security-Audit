import { Link } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Paper,
  AppBar, Toolbar, Stack, Container, Chip,
} from '@mui/material';
import {
  ShieldCheck, Lock, FileText, CheckCircle,
  KeyRound, Eye, Layers, Scale, Gavel, Clock3,
} from 'lucide-react';
export const LandingPage = () => {
  const features = [
    {
      icon: <Lock size={40} />,
      title: 'Confidential document control',
      desc: 'Structured access for case files, role-based permissions, and secure handling of sensitive materials.',
    },
    {
      icon: <CheckCircle size={40} />,
      title: 'Integrity verification',
      desc: 'Every upload is hashed and every download is verified so tampering is easy to detect.',
    },
    {
      icon: <FileText size={40} />,
      title: 'Case-centred organisation',
      desc: 'Case records, related documents, and updates stay aligned in a clean legal workflow.',
    },
  ];
  const standards = [
    { icon: <KeyRound size={30} />, label: 'JWT access', sub: 'Signed sessions with expiry handling' },
    { icon: <Eye size={30} />, label: 'Role-based access', sub: 'Admin, lawyer, paralegal, client' },
    { icon: <ShieldCheck size={30} />, label: 'Secure input handling', sub: 'Sanitisation and validation in the UI' },
    { icon: <Layers size={30} />, label: 'Audit-ready flow', sub: 'Traceable actions and protected records' },
  ];
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(15,31,51,0.08)' }}>
        <Toolbar sx={{ py: 1 }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Scale size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>LexVault</Typography>
              <Typography variant="caption" color="text.secondary">Secure legal case & document management</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.2}>
            <Link to="/login" style={{ textDecoration: 'none' }}><Button variant="outlined">Login</Button></Link>
            <Link to="/signup" style={{ textDecoration: 'none' }}><Button variant="contained">Get started</Button></Link>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ py: { xs: 8, md: 12 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 4, alignItems: 'center' }}>
          <Box>
            <Chip icon={<Gavel size={14} />} label="For modern law firms" sx={{ mb: 2, bgcolor: 'rgba(176,141,87,0.14)', fontWeight: 700 }} />
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: '2.5rem', md: '4.2rem' }, lineHeight: 1.05 }}>
              A polished workspace for secure legal operations
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 720, mb: 4, lineHeight: 1.8, fontWeight: 400 }}>
              Manage matters, clients, and documents with a professional interface that feels fit for a law office.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Link to="/signup" style={{ textDecoration: 'none' }}><Button size="large" variant="contained">Create account</Button></Link>
              <Link to="/login" style={{ textDecoration: 'none' }}><Button size="large" variant="outlined">Member login</Button></Link>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 4, flexWrap: 'wrap' }}>
              <Chip label="JWT sessions" />
              <Chip label="SHA-256 verification" />
              <Chip label="Role-based access" />
            </Stack>
          </Box>
          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, bgcolor: 'background.paper', boxShadow: '0 22px 50px rgba(15,31,51,0.12)' }}>
            <Typography variant="overline" sx={{ letterSpacing: 3, color: 'secondary.main', fontWeight: 800 }}>Practice dashboard</Typography>
            <Typography variant="h4" sx={{ mt: 1, mb: 2 }}>Everything a legal team needs</Typography>
            <Stack spacing={2.5}>
              {features.map(item => (
                <Box key={item.title} sx={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 2, alignItems: 'start', p: 1.5, borderRadius: 3, bgcolor: 'rgba(15,31,51,0.03)' }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>{item.icon}</Box>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>{item.title}</Typography>
                    <Typography color="text.secondary">{item.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ pb: 10 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>Security and governance baked in</Typography>
          <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 760 }}>
            The interface supports legal workflows without looking like a classroom project.
          </Typography>
          <Grid container spacing={2.5}>
            {standards.map(item => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.label}>
                <Paper sx={{ p: 3, height: '100%', borderRadius: 4 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(176,141,87,0.14)', color: 'secondary.main', mb: 2 }}>{item.icon}</Box>
                  <Typography fontWeight={700} sx={{ mb: 0.5 }}>{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.sub}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 5, mt: 3 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h6">LexVault</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Designed to look like a modern legal client portal.</Typography>
            </Box>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Clock3 size={16} />
              <Typography variant="body2" sx={{ opacity: 0.82 }}>Secure workflow • professional presentation • audit-friendly structure</Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};
