import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  getActiveSessionUserId,
  getRegisteredUsers,
  saveRegisteredUsers,
  setActiveSessionUserId,
  UserAccount,
  DEMO_USER_EMAIL,
} from '../services/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    homestayName: string,
    currency?: string
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; token?: string }>;
  resetPasswordWithToken: (
    email: string,
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string, homestayName: string, currency: string) => void;
  logout: () => void;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check existing session on load
  useEffect(() => {
    const activeId = getActiveSessionUserId();
    const users = getRegisteredUsers();
    if (activeId) {
      const found = users.find((u) => u.id === activeId);
      if (found) {
        setUser({
          id: found.id,
          email: found.email,
          name: found.name,
          homestayName: found.homestayName,
          currency: found.currency || '₹',
          createdAt: found.createdAt,
        });
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try server API (enables login from any device!)
    const serverRes = await api.login(cleanEmail, password);
    if (serverRes.success && serverRes.user) {
      setActiveSessionUserId(serverRes.user.id);
      setUser(serverRes.user);

      // Cache user locally for offline use
      const users = getRegisteredUsers();
      if (!users.some((u) => u.id === serverRes.user!.id)) {
        users.push({
          ...serverRes.user,
          passwordHash: password,
        });
        saveRegisteredUsers(users);
      }
      return { success: true };
    }

    // 2. Offline fallback
    const users = getRegisteredUsers();
    const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!matched) {
      return {
        success: false,
        error: serverRes.error || 'No homestay account found with this email address.',
      };
    }

    if (matched.passwordHash !== password) {
      return { success: false, error: 'Incorrect password. Please verify or use Forgot Password tab.' };
    }

    setActiveSessionUserId(matched.id);
    setUser({
      id: matched.id,
      email: matched.email,
      name: matched.name,
      homestayName: matched.homestayName,
      currency: matched.currency || '₹',
      createdAt: matched.createdAt,
    });

    return { success: true };
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    homestayName: string,
    currency = '₹'
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // Try server API first
    const serverRes = await api.signup(cleanEmail, password, name, homestayName, currency);
    if (serverRes.success && serverRes.user) {
      setActiveSessionUserId(serverRes.user.id);
      setUser(serverRes.user);

      const users = getRegisteredUsers();
      users.push({
        ...serverRes.user,
        passwordHash: password,
      });
      saveRegisteredUsers(users);
      return { success: true };
    }

    // Local fallback
    const users = getRegisteredUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      passwordHash: password,
      name: name.trim() || 'Homestay Host',
      homestayName: homestayName.trim() || 'My Homestay',
      currency,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    saveRegisteredUsers(updated);
    setActiveSessionUserId(newUser.id);
    setUser({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      homestayName: newUser.homestayName,
      currency: newUser.currency,
      createdAt: newUser.createdAt,
    });

    return { success: true };
  };

  const requestPasswordReset = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Try server API
    const serverRes = await api.requestPasswordReset(cleanEmail);
    if (serverRes.success && serverRes.token) {
      return { success: true, token: serverRes.token };
    }

    // Local fallback
    const users = getRegisteredUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (index === -1) {
      return { success: false, error: serverRes.error || 'No account found with this email.' };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    users[index].resetToken = resetCode;
    users[index].resetTokenExpires = Date.now() + 3600000 * 2;
    saveRegisteredUsers(users);
    return { success: true, token: resetCode };
  };

  const resetPasswordWithToken = async (email: string, token: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Try server API
    const serverRes = await api.resetPassword(cleanEmail, token, newPassword);
    if (serverRes.success) {
      // Also update local copy
      const users = getRegisteredUsers();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) {
        user.passwordHash = newPassword;
        saveRegisteredUsers(users);
      }
      return { success: true };
    }

    // Local fallback
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const users = getRegisteredUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    if (!user.resetToken || user.resetToken !== token.trim()) {
      return { success: false, error: 'Invalid reset code. Please check the code and try again.' };
    }

    user.passwordHash = newPassword;
    delete user.resetToken;
    delete user.resetTokenExpires;

    saveRegisteredUsers(users);
    return { success: true };
  };

  const updateProfile = async (name: string, homestayName: string, currency: string) => {
    if (!user) return;
    await api.updateProfile(user.id, name, homestayName, currency);

    const users = getRegisteredUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      users[index].name = name;
      users[index].homestayName = homestayName;
      users[index].currency = currency;
      saveRegisteredUsers(users);
    }

    setUser({
      ...user,
      name,
      homestayName,
      currency,
    });
  };

  const logout = () => {
    setActiveSessionUserId(null);
    setUser(null);
  };

  const loginAsDemo = async () => {
    await login(DEMO_USER_EMAIL, 'password123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        requestPasswordReset,
        resetPasswordWithToken,
        updateProfile,
        logout,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
