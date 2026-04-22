// Idea Detail Page
// Display detailed view of a single idea
// Based on specs/001-idea-spec-workflow/spec.md (FR-013b)

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getIdea, type IdeaDetail } from '../../../services/api';
import { isAuthenticated } from '../../../services/auth';

export default function IdeaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ideaId = params?.id as string;
  const [idea, setIdea] = useState<IdeaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Fetch idea details
  useEffect(() => {
    if (!ideaId) return;

    const fetchIdea = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getIdea(ideaId);
        setIdea(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load idea';
        setError(errorMessage);
        console.error('Error fetching idea:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIdea();
  }, [ideaId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading idea...</p>
        </div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-red-600 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-800 font-medium text-lg">
                Error loading idea
              </span>
            </div>
            <p className="mt-2 text-red-700">{error || 'Idea not found'}</p>
            <Link
              href="/browse"
              className="mt-4 inline-flex items-center text-red-700 hover:text-red-900 font-medium"
            >
              ← Back to browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/browse"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to browse
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">{idea.title}</h1>

          {/* Status and metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                idea.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : idea.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {idea.status}
            </span>

            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              {idea.author.email}
            </span>

            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              {new Date(idea.createdAt).toLocaleDateString()}
            </span>

            {idea.publishedAt && (
              <span className="text-gray-500">
                Published: {new Date(idea.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Summary */}
          {idea.metadata.summary && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Summary
              </h2>
              <p className="text-gray-700">{idea.metadata.summary}</p>
            </div>
          )}

          {/* Goals */}
          {idea.metadata.goals && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Goals
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {idea.metadata.goals}
              </p>
            </div>
          )}

          {/* Requirements */}
          {idea.metadata.requirements && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Requirements
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {idea.metadata.requirements}
              </p>
            </div>
          )}

          {/* Tags */}
          {idea.metadata.tags && idea.metadata.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {idea.metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Artifacts */}
          {idea.artifacts && idea.artifacts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Artifacts
              </h2>
              <div className="space-y-2">
                {idea.artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">
                        {artifact.filePath}
                      </span>
                    </div>
                    <span className="ml-2 text-xs text-gray-500 flex-shrink-0">
                      {(artifact.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Git info */}
          {idea.gitPath && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Repository Information
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex flex-col gap-1">
                  <dt className="font-medium text-gray-700">Repository Path:</dt>
                  <dd>
                    <a
                      href={`https://github.com/raycarroll/et_asdlc/blob/main/${idea.gitPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-mono text-xs break-all"
                    >
                      https://github.com/raycarroll/et_asdlc/blob/main/{idea.gitPath}
                    </a>
                  </dd>
                </div>
                {idea.gitCommitSha && (
                  <div className="flex flex-col gap-1">
                    <dt className="font-medium text-gray-700">Commit:</dt>
                    <dd>
                      <a
                        href={`https://github.com/raycarroll/et_asdlc/commit/${idea.gitCommitSha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-mono text-xs"
                      >
                        {idea.gitCommitSha.substring(0, 12)}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
