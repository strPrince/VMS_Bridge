import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import ReCAPTCHA from 'react-google-recaptcha';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { theme } = useTheme();

  const { success, error: toastError } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const token = recaptchaRef.current?.getValue();
    if (!token) {
      setError('Please complete the CAPTCHA');
      toastError('Please complete the CAPTCHA');
      return;
    }
    
    try {
      const loggedInUser = await login(email, password, token);
      success('Signed in successfully');
      
      // Check if user is admin and redirect accordingly
      if (loggedInUser.is_admin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      toastError(msg);
      // Reset CAPTCHA on error
      recaptchaRef.current?.reset();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-y-auto bg-background">
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

        <div className="w-full max-w-md z-10 flex flex-col gap-4 sm:gap-5 md:gap-6 my-4 sm:my-8">
            <div className="text-center flex flex-col items-center gap-2 sm:gap-3 md:gap-4">
                <div className="size-10 sm:size-12 bg-primary/10 rounded-xl flex items-center justify-center mb-1 sm:mb-2 overflow-hidden">
                   <img src="/VMS_logo.png" alt="VMS Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
                </div>
                <div className="space-y-1">
                    <h1 className="text-white tracking-tight text-2xl sm:text-[28px] font-bold leading-tight">Welcome Back</h1>
                    <p className="text-secondary text-sm sm:text-base font-normal">VMS Bridge - Vulnerability Management System Bridge</p>
                </div>
            </div>

            <div className="bg-surface rounded-xl border border-border shadow-2xl p-5 sm:p-6 md:p-8 w-full backdrop-blur-sm">
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}
                
                <form className="flex flex-col gap-4 sm:gap-5" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-2">
                        <label className="text-white text-sm font-medium leading-normal">Email</label>
                        <div className="group flex w-full items-center rounded-xl border border-border bg-surface-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                            <input 
                              className="flex-1 bg-transparent border-none text-white h-12 px-4 placeholder:text-secondary focus:ring-0 text-base" 
                              placeholder="name@company.com" 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-white text-sm font-medium leading-normal">Password</label>
                        <div className="group flex w-full items-center rounded-xl border border-border bg-surface-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                            <input 
                              className="flex-1 bg-transparent border-none text-white h-12 px-4 placeholder:text-secondary focus:ring-0 text-base" 
                              placeholder="••••••••" 
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                            <div className="pr-4 flex items-center justify-center text-secondary cursor-pointer hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">visibility_off</span>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <a href="#" className="text-xs text-primary hover:text-blue-400 font-medium">Forgot password?</a>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <ReCAPTCHA
                            ref={recaptchaRef}
                            // todo: Fix error 
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'your-site-key'}
                            theme={theme}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-on-primary shadow-sm hover:bg-blue-600 transition-all active:scale-[0.98] group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-secondary">
                        Don't have an account? 
                        <Link to="/signup" className="font-semibold text-primary hover:text-blue-400 hover:underline ml-1">Sign up</Link>
                    </p>
                </div>
            </div>
            
            <div className="text-center opacity-40 pb-2">
               <p className="text-xs text-secondary">© 2024 VMS Bridge Security Inc.</p>
            </div>
        </div>
    </div>
  );
};

export default Login;

