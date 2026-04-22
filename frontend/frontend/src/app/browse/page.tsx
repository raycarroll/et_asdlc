// Browse Page
// Main page for browsing and filtering ideas
// Based on specs/001-idea-spec-workflow/spec.md (FR-012, FR-013, FR-014)

'use client';

import React, { useEffect, useState, Suspense } from 'react';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { IdeaList } from '../../components/IdeaList';
import { FilterPanel } from '../../components/FilterPanel';
import { Pagination } from '../../components/Pagination';
import { useQueryParams } from '../../hooks/useQueryParams';
import { useIdeas } from '../../hooks/useIdeas';
import { isAuthenticated, logout } from '../../services/auth';
import type { IdeaFilters } from '../../services/api';

function BrowsePageContent() {
  const router = useRouter();
  const { getCurrentState, updateQueryParams } = useQueryParams();
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Get initial state from URL query parameters
  const initialState = getCurrentState();

  // Use ideas hook with initial state from URL
  const {
    ideas,
    pagination,
    loading,
    error,
    setFilters,
    setPage,
    setPageSize,
  } = useIdeas({
    filters: initialState.filters,
    pagination: initialState.pagination,
    autoFetch: true,
  });

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: IdeaFilters) => {
    setFilters(newFilters);
    updateQueryParams({
      filters: newFilters,
      pagination: { page: 1 }, // Reset to page 1 when filters change
    });
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setPage(page);
    updateQueryParams({
      pagination: { page },
    });
  };

  // Handle page size changes
  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
    updateQueryParams({
      pagination: { page: 1, pageSize },
    });
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Extract available tags from current ideas (for filter suggestions)
  useEffect(() => {
    const tags = new Set<string>();
    ideas.forEach((idea) => {
      idea.tags?.forEach((tag) => tags.add(tag));
    });
    setAvailableTags(Array.from(tags).sort());
  }, [ideas]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Idea Repository
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Browse and explore published ideas
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <div className="lg:col-span-1">
            <FilterPanel
              filters={initialState.filters}
              onFiltersChange={handleFiltersChange}
              availableTags={availableTags}
            />
          </div>

          {/* Ideas list */}
          <div className="lg:col-span-3 space-y-6">
            {/* Ideas */}
            <IdeaList
              ideas={ideas}
              pagination={pagination}
              loading={loading}
              error={error}
            />

            {/* Pagination */}
            {!loading && !error && ideas.length > 0 && (
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <BrowsePageContent />
    </Suspense>
  );
}
