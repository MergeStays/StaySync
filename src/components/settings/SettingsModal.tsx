import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  User,
  Home,
  Lock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, logout, resetPasswordWithToken, requestPasswordReset } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [homestayName, setHomestayName] = useState(user?.homestayName || '');
  const [currency, setCurrency] = useState(user?.currency || '₹');

  // Password reset section
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pinNotice, setPinNotice] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(name, homestayName, currency);
    setFeedback({ success: true, msg: 'Homestay profile details saved!' });
  };

  const handleTriggerResetPin = async () => {
    if (!user) return;
    const res = await requestPasswordReset(user.email);
    if (res.success && res.token) {
      setResetToken(res.token);
      setPinNotice(`Verification PIN for ${user.email}: ${res.token}`);
      setIsChangingPassword(true);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !resetToken || !newPassword) return;

    const res = await resetPasswordWithToken(user.email, resetToken, newPassword);
    if (res.success) {
      setFeedback({ success: true, msg: 'Password successfully changed!' });
      setIsChangingPassword(false);
      setNewPassword('');
      setPinNotice(null);
    } else {
      setFeedback({ success: false, msg: res.error || 'Failed to change password.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Host & Property Settings</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              feedback.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Security badge */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Multi-Device Access Enabled:</strong> You can log in with <strong className="text-emerald-300">{user?.email}</strong> from your Android mobile phone, laptop, or tablet. Any device logged into this email has full permission to modify rooms, block dates, and update bookings with instant synchronization.
          </span>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Homestay / Villa Name
            </label>
            <div className="relative">
              <Home className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={homestayName}
                onChange={(e) => setHomestayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Host Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Display Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="₹">₹ (INR - Rupees)</option>
                <option value="$">$ (USD - Dollars)</option>
                <option value="€">€ (EUR - Euros)</option>
                <option value="£">£ (GBP - Pounds)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Save Profile Details
          </button>
        </form>

        {/* Password Reset Section */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password & Key Recovery</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Change your password with email recovery code
              </p>
            </div>

            {!isChangingPassword && (
              <button
                type="button"
                onClick={handleTriggerResetPin}
                className="px-2.5 py-1 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30 transition-colors"
              >
                Reset Password
              </button>
            )}
          </div>

          {pinNotice && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
              {pinNotice}
            </div>
          )}

          {isChangingPassword && (
            <form onSubmit={handleUpdatePassword} className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  6-Digit Verification PIN
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="e.g. 849201"
                  className="w-full px-3 py-2 font-mono text-center bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="w-1/2 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
                >
                  Confirm New Password
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sign Out */}
        <div className="pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Homestay Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
