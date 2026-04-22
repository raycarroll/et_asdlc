// Admin Templates Page
// Template management interface for administrators
// Based on specs/001-idea-spec-workflow/spec.md (FR-015b, FR-015c, FR-015d, FR-015e)

'use client';

import React, { useState, useEffect, Suspense } from 'react';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { TemplateList } from '../../../components/TemplateList';
import {
  TemplateEditor,
  type Template,
  type ValidationError,
} from '../../../components/TemplateEditor';
import { isAuthenticated, isAdmin, logout } from '../../../services/auth';

function AdminTemplatesPageContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );

  // Check authentication and admin role on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!isAdmin()) {
      router.push('/browse');
      return;
    }

    // Load templates
    fetchTemplates();
  }, [router]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/templates', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load templates';
      setError(errorMessage);
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);

    try {
      const response = await fetch(`/api/v1/templates/${template.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load template content');
      }

      const data = await response.json();
      setSelectedTemplate({
        ...template,
        content: data.content,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load template';
      setError(errorMessage);
      console.error('Error loading template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content: string) => {
    if (!selectedTemplate) {
      return;
    }

    setValidationErrors([]);

    try {
      const response = await fetch(`/api/v1/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle validation errors
        if (errorData.errors) {
          const errors: ValidationError[] = errorData.errors.map(
            (err: string) => ({
              message: err,
              type: 'error' as const,
            })
          );
          setValidationErrors(errors);
        }

        throw new Error(errorData.message || 'Failed to save template');
      }

      const data = await response.json();

      // Update selected template with new version
      setSelectedTemplate({
        ...selectedTemplate,
        content,
        lastModifiedAt: data.lastModifiedAt,
        lastModifiedBy: data.lastModifiedBy,
      });

      // Refresh templates list
      await fetchTemplates();

      // Show success message
      alert('Template saved successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save template';

      // If no validation errors were set, show a generic error
      if (validationErrors.length === 0) {
        setError(errorMessage);
      }

      console.error('Error saving template:', err);
      throw err; // Re-throw to let TemplateEditor handle it
    }
  };

  const handleCancel = () => {
    setSelectedTemplate(null);
    setValidationErrors([]);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Template Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage validation templates and guidelines
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/browse')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Browse Ideas
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
          {/* Template list sidebar */}
          <div className="lg:col-span-1">
            <TemplateList
              templates={templates}
              selectedTemplateId={selectedTemplate?.id || null}
              onSelectTemplate={handleSelectTemplate}
              loading={loading && templates.length === 0}
              error={error}
            />
          </div>

          {/* Template editor */}
          <div className="lg:col-span-3">
            <TemplateEditor
              template={selectedTemplate}
              onSave={handleSave}
              onCancel={handleCancel}
              validationErrors={validationErrors}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminTemplatesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AdminTemplatesPageContent />
    </Suspense>
  );
}
