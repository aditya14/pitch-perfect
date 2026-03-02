import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { AlertCircle, CheckCircle2, KeyRound, UserCircle2 } from 'lucide-react';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });

  // Password change form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Fetch user profile data on initial load
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/user/profile/');
        setFormData({
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || '',
          email: response.data.email || ''
        });
      } catch (err) {
        setError('Failed to load user profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Update form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch('/user/profile/', {
        first_name: formData.first_name,
        last_name: formData.last_name
      });

      // Update the user data in context
      if (user && setUser) {
        setUser({
          ...user,
          first_name: response.data.first_name,
          last_name: response.data.last_name
        });
      }

      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPassword(true);
    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      setSubmittingPassword(false);
      return;
    }

    try {
      await api.post('/user/change-password/', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      // Clear password form
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const isSubmitting = submittingProfile || submittingPassword;

  return (
    <div className="container mx-auto px-4 py-10 sm:py-8 max-w-4xl">
        <div className="lg-glass lg-rounded-xl border border-white/40 dark:border-white/10 p-4 sm:p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold font-caption text-slate-900 dark:text-white">
                Profile & Security
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Manage your profile details and password.
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-primary-100 dark:bg-primary-900/40 border border-primary-300/40 dark:border-primary-500/30 items-center justify-center">
              <UserCircle2 className="h-6 w-6 text-primary-700 dark:text-primary-300" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'lg-glass-primary text-primary-700 dark:text-primary-300 font-medium'
                  : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
              }`}
              onClick={() => {
                setActiveTab('profile');
                setError(null);
                setSuccess(null);
              }}
            >
              Profile
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm lg-rounded-md transition-all duration-200 ${
                activeTab === 'password'
                  ? 'lg-glass-primary text-primary-700 dark:text-primary-300 font-medium'
                  : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
              }`}
              onClick={() => {
                setActiveTab('password');
                setError(null);
                setSuccess(null);
              }}
            >
              Password
            </button>
          </div>

          {success && (
            <div className="flex items-start gap-3 rounded-lg border border-green-300/70 dark:border-green-500/30 bg-green-50/85 dark:bg-green-900/25 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-sm text-slate-800 dark:text-slate-100">{success}</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-300/70 dark:border-red-500/30 bg-red-50/85 dark:bg-red-900/25 px-4 py-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <span className="text-sm text-slate-800 dark:text-slate-100">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-lg border border-slate-200/90 dark:border-neutral-700 bg-slate-100/90 dark:bg-neutral-900 p-5 sm:p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="h-11 w-full rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="h-11 w-full rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="h-11 w-full rounded bg-slate-200 dark:bg-neutral-800" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="first_name" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleProfileChange}
                        className="w-full rounded-md px-4 py-3 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="last_name" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleProfileChange}
                        className="w-full rounded-md px-4 py-3 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email Address</div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">{formData.email || '-'}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Contact support to change your account's email.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto lg-button lg-rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submittingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <KeyRound className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                      Change Password
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="current_password" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="current_password"
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        required
                        className="w-full rounded-md px-4 py-3 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="Current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="new_password" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="new_password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        required
                        className="w-full rounded-md px-4 py-3 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="New password"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm_password" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirm_password"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        required
                        className="w-full rounded-md px-4 py-3 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto lg-button lg-rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submittingPassword ? 'Changing...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
    </div>
  );
};

export default Profile;
