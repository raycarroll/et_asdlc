// FilterPanel Component
// Filters for author, status, tags, date range
// Based on specs/001-idea-spec-workflow/spec.md (FR-014, FR-014a, FR-014b)

'use client';

import React, { useState } from 'react';
import type { IdeaFilters } from '../services/api';

export interface FilterPanelProps {
  filters: IdeaFilters;
  onFiltersChange: (filters: IdeaFilters) => void;
  availableTags?: string[];
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableTags = [],
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<IdeaFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof IdeaFilters, value: any) => {
    const updated = {
      ...localFilters,
      [key]: value,
    };
    setLocalFilters(updated);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearFilters = () => {
    const empty: IdeaFilters = {};
    setLocalFilters(empty);
    onFiltersChange(empty);
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label
          htmlFor="search"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Search
        </label>
        <input
          type="text"
          id="search"
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search ideas..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Expandable filters */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Author filter */}
          <div>
            <label
              htmlFor="author"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Author Email
            </label>
            <input
              type="email"
              id="author"
              value={localFilters.author || ''}
              onChange={(e) => handleFilterChange('author', e.target.value)}
              placeholder="author@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="status"
              value={localFilters.status || ''}
              onChange={(e) =>
                handleFilterChange(
                  'status',
                  e.target.value || undefined
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Tags filter */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={localFilters.tags?.join(', ') || ''}
              onChange={(e) =>
                handleFilterChange(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0)
                )
              }
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated tags (OR logic)
            </p>

            {/* Popular tags */}
            {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-1">Popular tags:</p>
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const current = localFilters.tags || [];
                        if (!current.includes(tag)) {
                          handleFilterChange('tags', [...current, tag]);
                        }
                      }}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date range filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="dateFrom"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                From Date
              </label>
              <input
                type="date"
                id="dateFrom"
                value={localFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="dateTo"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                To Date
              </label>
              <input
                type="date"
                id="dateTo"
                value={localFilters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={applyFilters}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Apply Filters
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-3 text-xs text-gray-600">
          {Object.keys(localFilters).length} filter(s) active
        </div>
      )}
    </div>
  );
}
