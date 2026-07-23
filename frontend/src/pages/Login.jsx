import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure, clearAuthError } from '../redux/authSlice';
import API from '../services/api';
import { ShoppingBag, Lock, Mail, User, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
  const [viewState, setViewState] = useState('login'); // 'login' or 'forgot' or 'reset'
  const [resetToken, setResetToken] = useState('');
  const [searchParams] = useSearchParams();
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const { register: loginReg, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm();
  const { register: forgotReg, handleSubmit: handleForgotSubmit, formState: { errors: forgotErrors }, reset: resetForgotForm } = useForm();
  const { register: resetReg, handleSubmit: handleResetSubmit, formState: { errors: resetErrors }, reset: resetResetForm } = useForm();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Check if resetToken exists in URL (e.g. ?resetToken=xxx)
  useEffect(() => {
    const token = searchParams.get('resetToken');
    if (token) {
      setResetToken(token);
      setViewState('reset');
    }
  }, [searchParams]);

  // Clear errors on view switch
  const switchView = (view) => {
    dispatch(clearAuthError());
    setViewState(view);
  };

  // Submit Login
  const onLogin = async (data) => {
    dispatch(loginStart());
    try {
      const res = await API.post('/auth/login', {
        emailOrEmpId: data.emailOrEmpId,
        password: data.password
      });
      dispatch(loginSuccess(res.data));
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      dispatch(loginFailure(msg));
      toast.error(msg);
    }
  };

  // Submit Forgot Password
  const onForgot = async (data) => {
    try {
      const res = await API.post('/auth/forgot-password', { email: data.email });
      toast.success(res.data.message || 'Password reset link simulated.');
      // Auto-populate token for developer testing convenience
      if (res.data.resetToken) {
        toast.info(`[Dev Assist] Token: ${res.data.resetToken}. Redirecting to Reset view...`);
        setResetToken(res.data.resetToken);
        setViewState('reset');
      } else {
        switchView('login');
      }
      resetForgotForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed.');
    }
  };

  // Submit Reset Password
  const onReset = async (data) => {
    try {
      const res = await API.post(`/auth/reset-password/${resetToken}`, { password: data.password });
      toast.success(res.data.message || 'Password reset successfully!');
      switchView('login');
      resetResetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden font-sans px-4">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3.5 mb-8 animate-fade-in">
          <div className="p-3.5 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/20 shadow-xl shadow-violet-950/20">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">
              VORTEX
            </h1>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
              Inventory Enterprise
            </span>
          </div>
        </div>

        {/* Auth Panel */}
        <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-2xl p-8">
          {viewState === 'login' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-100">Welcome Back</h2>
                <p className="text-xs text-slate-500 mt-1">Enter credentials to manage your branches</p>
              </div>

              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
                {/* Username Input */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email / Employee ID</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="admin@inventory.com or EMP001"
                      className={`w-full bg-slate-950/60 border ${loginErrors.emailOrEmpId ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500/20'} rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 transition-all`}
                      {...loginReg('emailOrEmpId', { required: 'Please enter Email or Employee ID' })}
                    />
                  </div>
                  {loginErrors.emailOrEmpId && (
                    <span className="text-[10px] text-red-400 mt-1 block font-medium">{loginErrors.emailOrEmpId.message}</span>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className={`w-full bg-slate-950/60 border ${loginErrors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500/20'} rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 transition-all`}
                      {...loginReg('password', { required: 'Please enter password' })}
                    />
                  </div>
                  {loginErrors.password && (
                    <span className="text-[10px] text-red-400 mt-1 block font-medium">{loginErrors.password.message}</span>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-950/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {viewState === 'forgot' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-100 font-sans">Reset Password</h2>
                <p className="text-xs text-slate-500 mt-1">We will generate reset instructions for your account</p>
              </div>

              <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      placeholder="admin@inventory.com"
                      className={`w-full bg-slate-950/60 border ${forgotErrors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500/20'} rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 transition-all`}
                      {...forgotReg('email', { required: 'Please enter your registered email' })}
                    />
                  </div>
                  {forgotErrors.email && (
                    <span className="text-[10px] text-red-400 mt-1 block font-medium">{forgotErrors.email.message}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-950/20 cursor-pointer"
                >
                  Send Reset Instructions
                </button>

                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mt-2"
                >
                  Back to Sign In
                </button>
              </form>
            </div>
          )}

          {viewState === 'reset' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-100">Set New Password</h2>
                <p className="text-xs text-slate-500 mt-1">Enter your new secure workspace password</p>
              </div>

              <form onSubmit={handleResetSubmit(onReset)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">New Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className={`w-full bg-slate-950/60 border ${resetErrors.password ? 'border-red-500' : 'border-slate-800'} rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all`}
                      {...resetReg('password', {
                        required: 'Please enter your new password',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                      })}
                    />
                  </div>
                  {resetErrors.password && (
                    <span className="text-[10px] text-red-400 mt-1 block font-medium">{resetErrors.password.message}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-950/20 cursor-pointer"
                >
                  Save New Password
                </button>

                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors mt-2 cursor-pointer"
                >
                  Cancel and Sign In
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
