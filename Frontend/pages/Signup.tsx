import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import ReCAPTCHA from 'react-google-recaptcha';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflowY = 'auto';
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, text: '', color: '' };
    if (pwd.length < 6) return { strength: 1, text: 'Weak password. Try adding more characters.', color: 'bg-yellow-500' };
    if (pwd.length < 10) return { strength: 2, text: 'Fair password. Consider adding special characters.', color: 'bg-yellow-500' };
    if (pwd.length < 14) return { strength: 3, text: 'Good password.', color: 'bg-green-500' };
    return { strength: 4, text: 'Strong password!', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const { success, error: toastError } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const token = recaptchaRef.current?.getValue();
    if (!token) {
      setError('Please complete the CAPTCHA');
      toastError('Please complete the CAPTCHA');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      toastError('Passwords do not match');
      return;
    }
    
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      toastError('Please agree to the terms and conditions');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      toastError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      const newUser = await signup(email, password, fullName, token);
      success('Account created successfully');
      
      // Check if user is admin and redirect accordingly
      if (newUser.is_admin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(msg);
      toastError(msg);
      // Reset CAPTCHA on error
      recaptchaRef.current?.reset();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 relative overflow-y-auto bg-background">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-tone-low/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-primary/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
        {/* Grid Pattern */}
        <div
          className="fixed inset-0 z-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--color-border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
        ></div>
      </div>

      <div className="w-full max-w-md z-10 flex flex-col gap-3 sm:gap-4 my-auto">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="size-10 sm:size-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">hub</span>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-white tracking-tight text-xl sm:text-2xl md:text-[28px] font-bold leading-tight">Create your account</h1>
            <p className="text-secondary text-xs sm:text-sm font-normal">Join the VMS Bridge - Vulnerability Management System Bridge platform.</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-2xl p-4 sm:p-5 md:p-6 w-full backdrop-blur-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <form className="flex flex-col gap-3" onSubmit={handleSignup}>
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs sm:text-sm font-medium leading-normal">Full Name</label>
              <div className={`group flex w-full items-center rounded-xl border ${fullName ? 'border-green-500' : 'border-border'} bg-surface-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all`}>
                <input 
                  className="flex-1 bg-transparent border-none text-white h-12 px-4 placeholder:text-secondary focus:ring-0 text-base" 
                  placeholder="Alex Chen" 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                {fullName && (
                  <div className="pr-4 flex items-center justify-center text-green-500">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                )}
              </div>
            </div>

            {/* Work Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs sm:text-sm font-medium leading-normal">Work Email</label>
              <div className={`group flex w-full items-center rounded-xl border ${email && email.includes('@') ? 'border-green-500' : 'border-border'} bg-surface-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all`}>
                <input 
                  className="flex-1 bg-transparent border-none text-white h-12 px-4 placeholder:text-secondary focus:ring-0 text-base" 
                  placeholder="alex.c@vmsbridge.io" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {email && email.includes('@') && (
                  <div className="pr-4 flex items-center justify-center text-green-500">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs sm:text-sm font-medium leading-normal">Password</label>
              <div className="group flex w-full items-center rounded-xl border border-border bg-surface-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                <input 
                  className="flex-1 bg-transparent border-none text-white h-12 px-4 placeholder:text-secondary focus:ring-0 text-base" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div 
                  className="pr-4 flex items-center justify-center text-secondary cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </div>
              </div>
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          level <= passwordStrength.strength 
                            ? passwordStrength.color 
                            : 'bg-border'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-500 mt-1">{passwordStrength.text}</p>
                </>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs sm:text-sm font-medium leading-normal">Confirm Password</label>
              <div className={`group flex w-full items-center rounded-xl border ${confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-border'} bg-surface-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all`}>
                <input 
                  className="flex-1 bg-transparent border-none text-white h-12 px-4 placeholder:text-secondary focus:ring-0 text-base" 
                  placeholder="••••••••" 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div 
                  className="pr-4 flex items-center justify-center text-secondary cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <div className="pr-4 flex items-center justify-center text-red-500">
                    <span className="material-symbols-outlined">cancel</span>
                  </div>
                )}
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-2 mt-0.5">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border bg-surface-2 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                required
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-secondary cursor-pointer leading-snug">
                I agree to the{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'your-site-key'}
                theme={theme}
              />
            </div>

            <button 
              type="submit"
              disabled={!passwordsMatch || !agreedToTerms || isLoading}
              className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm sm:text-base font-bold text-on-primary shadow-sm hover:bg-blue-600 transition-all active:scale-[0.98] group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs sm:text-sm text-secondary">
              Already have an account? 
              <Link to="/login" className="font-semibold text-primary hover:text-blue-400 hover:underline ml-1 cursor-pointer">Sign in</Link>
            </p>
          </div>
        </div>
        
        <div className="text-center opacity-40">
          <p className="text-[10px] sm:text-xs text-secondary">© 2024 VMS Bridge Security Inc.</p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

