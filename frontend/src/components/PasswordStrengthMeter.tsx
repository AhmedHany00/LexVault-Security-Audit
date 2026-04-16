import { Box, LinearProgress, Typography } from '@mui/material';
import { Check, X } from 'lucide-react';
import { checkPasswordStrength } from '../utils/validation';
interface PasswordStrengthMeterProps {
  password: string;
}
export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  if (!password) return null;
  const strength = checkPasswordStrength(password);
  const progress = (strength.score / 5) * 100;
  const criteria = [
    { key: 'length'    as const, label: '8+ characters' },
    { key: 'uppercase' as const, label: 'Uppercase (A-Z)' },
    { key: 'lowercase' as const, label: 'Lowercase (a-z)' },
    { key: 'number'    as const, label: 'Number (0-9)' },
    { key: 'special'   as const, label: 'Special character' },
  ];
  return (
    <Box sx={{ mt: 1, mb: 1 }} data-testid="password-strength-meter">
      {}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Password Strength
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: strength.color, fontWeight: 'bold' }}
          aria-label={`Password strength: ${strength.label}`}
        >
          {strength.label}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label="password strength indicator"
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: '#e0e0e0',
          '& .MuiLinearProgress-bar': {
            bgcolor: strength.color,
            borderRadius: 3,
            transition: 'width 0.3s ease, background-color 0.3s ease',
          },
        }}
      />
      {}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {criteria.map(({ key, label }) => {
          const met = strength.checks[key];
          return (
            <Box
              key={key}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}
              aria-label={`${label}: ${met ? 'met' : 'not met'}`}
            >
              {met
                ? <Check size={11} color="#388e3c" aria-hidden />
                : <X     size={11} color="#bdbdbd" aria-hidden />
              }
              <Typography
                variant="caption"
                sx={{ color: met ? '#388e3c' : '#9e9e9e', fontSize: '0.68rem' }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
