import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
const renderWithRouter = (ui: React.ReactElement, { initialEntries = ['/'] } = {}) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </AuthProvider>
  );
describe('PasswordStrengthMeter', () => {
  it('does not render when password is empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });
  it('renders when a password is provided', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
  });
  it('shows "Weak" for a very short, simple password', () => {
    render(<PasswordStrengthMeter password="a" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });
  it('shows "Very Strong" for a fully complex password', () => {
    render(<PasswordStrengthMeter password="Secure@Pass1!" />);
    expect(screen.getByText('Very Strong')).toBeInTheDocument();
  });
  it('displays all 5 criteria labels', () => {
    render(<PasswordStrengthMeter password="test" />);
    expect(screen.getByText('8+ characters')).toBeInTheDocument();
    expect(screen.getByText('Uppercase (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Lowercase (a-z)')).toBeInTheDocument();
    expect(screen.getByText('Number (0-9)')).toBeInTheDocument();
    expect(screen.getByText('Special character')).toBeInTheDocument();
  });
  it('updates strength label dynamically as password changes', () => {
    const { rerender } = render(<PasswordStrengthMeter password="abc" />);
    rerender(<PasswordStrengthMeter password="Secure@Pass1!" />);
    expect(screen.getByText('Very Strong')).toBeInTheDocument();
  });
});
describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        } />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: 'Invalid credentials' } },
    }),
    isAxiosError: (e: unknown) => !!(e as { isAxiosError?: boolean }).isAxiosError,
  },
}));
const { Login } = await import('../components/Login');
describe('Login component — client-side validation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  it('renders the login form', () => {
    renderWithRouter(<Login />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
  it('shows email validation error for an invalid email format', async () => {
    renderWithRouter(<Login />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'notvalid');
    await userEvent.type(screen.getByLabelText(/password/i), 'somepass');
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });
  it('shows password required error when password is empty', async () => {
    renderWithRouter(<Login />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
});
const { Signup } = await import('../components/Signup');
describe('Signup component — password mismatch validation', () => {
  it('shows mismatch error when passwords do not match', async () => {
    renderWithRouter(<Signup />);
    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@firm.com');
    const pwFields = screen.getAllByLabelText(/password/i);
    await userEvent.type(pwFields[0], 'Secure@Pass1!');
    await userEvent.type(pwFields[1], 'DifferentPass@1!');
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
  it('renders the password strength meter when typing', async () => {
    renderWithRouter(<Signup />);
    const pwFields = screen.getAllByLabelText(/password/i);
    await userEvent.type(pwFields[0], 'test');
    expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
  });
});
