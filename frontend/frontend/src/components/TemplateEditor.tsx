// TemplateEditor Component
// View and edit template content with validation
// Based on specs/001-idea-spec-workflow/spec.md (FR-015c, FR-015d, FR-015e)

'use client';

import React, { useState, useEffect } from 'react';

export interface Template {
  id: string;
  type: 'spec' | 'guideline' | 'validation';
  name: string;
  description: string | null;
  filePath: string;
  content?: string;
  lastModifiedAt: string;
  lastModifiedBy: string | null;
}

export interface ValidationError {
  line?: number;
  message: string;
  type: 'error' | 'warning';
}

export interface TemplateEditorProps {
  template: Template | null;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  validationErrors?: ValidationError[];
  loading?: boolean;
}

export function TemplateEditor({
  template,
  onSave,
  onCancel,
  validationErrors = [],
  loading = false,
}: TemplateEditorProps) {
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load template content when template changes
  useEffect(() => {
    if (template?.content) {
      setContent(template.content);
      setHasChanges(false);
    }
  }, [template]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== template?.content);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      return;
    }

    setSaving(true);
    try {
      await onSave(content);
      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) {
        return;
      }
    }
    onCancel();
  };

  if (!template) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No template selected
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Select a template from the list to view or edit it.
        </p>
      </div>
    );
  }

  const errors = validationErrors.filter((e) => e.type === 'error');
  const warnings = validationErrors.filter((e) => e.type === 'warning');

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {template.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{template.filePath}</p>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600 font-medium">
                Unsaved changes
              </span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                template.type === 'spec'
                  ? 'bg-blue-100 text-blue-800'
                  : template.type === 'guideline'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {template.type}
            </span>
          </div>
        </div>

        {template.description && (
          <p className="text-sm text-gray-600 mt-2">{template.description}</p>
        )}
      </div>

      {/* Validation errors/warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="border-b border-gray-200 p-4 space-y-2">
          {errors.map((error, index) => (
            <div
              key={`error-${index}`}
              className="bg-red-50 border border-red-200 rounded p-3 text-sm"
            >
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className="font-medium text-red-800">Error</span>
                  {error.line && (
                    <span className="text-red-700"> (Line {error.line})</span>
                  )}
                  <p className="text-red-700 mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          ))}

          {warnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm"
            >
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className="font-medium text-yellow-800">Warning</span>
                  {warning.line && (
                    <span className="text-yellow-700">
                      {' '}
                      (Line {warning.line})
                    </span>
                  )}
                  <p className="text-yellow-700 mt-1">{warning.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="p-4">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          disabled={loading || saving}
          className="w-full h-96 p-3 font-mono text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
          placeholder="Template content..."
          spellCheck={false}
        />
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Last modified:{' '}
            {new Date(template.lastModifiedAt).toLocaleString()}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || errors.length > 0}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                !hasChanges || saving || errors.length > 0
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
