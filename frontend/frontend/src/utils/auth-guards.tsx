// Authentication Route Guards
// Protect routes based on authentication and role
// Based on specs/001-idea-spec-workflow/spec.md (FR-001, FR-015a)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAdmin } from '../services/auth';

/**
 * Hook to protect routes that require authentication
 */
export function useRequireAuth() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);
}

/**
 * Hook to protect routes that require admin role
 */
export function useRequireAdmin() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!isAdmin()) {
      // Redirect non-admin users to browse page
      router.push('/browse');
    }
  }, [router]);
}

/**
 * Higher-order component to protect routes requiring authentication
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthGuardedComponent(props: P) {
    const router = useRouter();

    useEffect(() => {
      if (!isAuthenticated()) {
        router.push('/login');
      }
    }, [router]);

    // Show loading state while checking auth
    if (!isAuthenticated()) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Higher-order component to protect routes requiring admin role
 */
export function withAdmin<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AdminGuardedComponent(props: P) {
    const router = useRouter();

    useEffect(() => {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      if (!isAdmin()) {
        router.push('/browse');
      }
    }, [router]);

    // Show loading state while checking auth
    if (!isAuthenticated() || !isAdmin()) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Check if current route is accessible to the user
 */
export function canAccessRoute(route: string): boolean {
  // Public routes
  const publicRoutes = ['/login'];
  if (publicRoutes.includes(route)) {
    return true;
  }

  // Routes requiring authentication
  const authRoutes = ['/browse', '/ideas'];
  if (authRoutes.some((r) => route.startsWith(r))) {
    return isAuthenticated();
  }

  // Routes requiring admin role
  const adminRoutes = ['/admin'];
  if (adminRoutes.some((r) => route.startsWith(r))) {
    return isAuthenticated() && isAdmin();
  }

  // Default: require authentication
  return isAuthenticated();
}
