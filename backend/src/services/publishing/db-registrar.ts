// Database Registration Service
// Stores idea and metadata records in PostgreSQL
// Based on specs/001-idea-spec-workflow/data-model.md

import { logger } from '../../utils/logger.js';
import type { Pool } from 'pg';
import type { Idea, IdeaRecord } from '../../models/idea.js';
import type {
  MetadataRecord,
  MetadataRecordRecord,
} from '../../models/metadata.js';
import type { Artifact, ArtifactRecord } from '../../models/artifact.js';
import type { ExtractedMetadata } from './metadata-extractor.js';

export interface RegistrationData {
  idea: Idea;
  metadata: ExtractedMetadata;
  artifacts: Artifact[];
}

export interface RegistrationResult {
  success: boolean;
  ideaId: string | null;
  metadataId: string | null;
  artifactIds: string[];
  error?: Error;
}

/**
 * Register idea, metadata, and artifacts in database
 * Must be called within a transaction for atomic rollback
 */
export async function registerInDatabase(
  data: RegistrationData,
  pool: Pool
): Promise<RegistrationResult> {
  const client = await pool.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    logger.info('Registering idea in database', {
      ideaId: data.idea.id,
      title: data.idea.title,
    });

    // Insert idea
    const ideaQuery = `
      INSERT INTO ideas (id, user_id, title, status, created_at, updated_at, published_at, git_path, git_commit_sha)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const ideaValues = [
      data.idea.id,
      data.idea.userId,
      data.idea.title,
      data.idea.status,
      data.idea.createdAt,
      data.idea.updatedAt,
      data.idea.publishedAt,
      data.idea.gitPath,
      data.idea.gitCommitSha,
    ];

    const ideaResult = await client.query(ideaQuery, ideaValues);
    const ideaId = ideaResult.rows[0]?.id;

    logger.debug('Idea inserted', { ideaId });

    // Insert metadata
    const metadataId = crypto.randomUUID();
    const metadataQuery = `
      INSERT INTO metadata_records (id, idea_id, summary, goals, requirements, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const now = new Date();
    const metadataValues = [
      metadataId,
      data.idea.id,
      data.metadata.summary,
      data.metadata.goals,
      data.metadata.requirements,
      data.metadata.tags,
      now,
      now,
    ];

    const metadataResult = await client.query(metadataQuery, metadataValues);
    const insertedMetadataId = metadataResult.rows[0]?.id;

    logger.debug('Metadata inserted', { metadataId: insertedMetadataId });

    // Insert artifacts
    const artifactIds: string[] = [];

    for (const artifact of data.artifacts) {
      const artifactQuery = `
        INSERT INTO artifacts (id, idea_id, file_path, file_type, content_type, size_bytes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const artifactValues = [
        artifact.id,
        data.idea.id,
        artifact.filePath,
        artifact.fileType,
        artifact.contentType,
        artifact.sizeBytes,
        artifact.createdAt,
      ];

      const artifactResult = await client.query(artifactQuery, artifactValues);
      const artifactId = artifactResult.rows[0]?.id;

      if (artifactId) {
        artifactIds.push(artifactId);
      }

      logger.debug('Artifact inserted', {
        artifactId,
        filePath: artifact.filePath,
      });
    }

    // Update tag usage counts
    await updateTagUsage(data.metadata.tags, client);

    // Commit transaction
    await client.query('COMMIT');

    logger.info('Database registration complete', {
      ideaId,
      metadataId: insertedMetadataId,
      artifactCount: artifactIds.length,
    });

    return {
      success: true,
      ideaId,
      metadataId: insertedMetadataId,
      artifactIds,
    };
  } catch (error) {
    // Rollback transaction
    await client.query('ROLLBACK');

    logger.error('Database registration failed', {
      ideaId: data.idea.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      ideaId: null,
      metadataId: null,
      artifactIds: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    client.release();
  }
}

/**
 * Update tag usage counts (upsert tags table)
 */
async function updateTagUsage(tags: string[], client: any): Promise<void> {
  for (const tag of tags) {
    const query = `
      INSERT INTO tags (id, name, usage_count, created_at)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (name)
      DO UPDATE SET usage_count = tags.usage_count + 1
    `;

    const values = [crypto.randomUUID(), tag, new Date()];

    await client.query(query, values);

    logger.debug('Tag usage updated', { tag });
  }
}

/**
 * Delete idea and related records from database
 * Used for rollback in atomic transaction coordinator
 */
export async function deleteFromDatabase(
  ideaId: string,
  pool: Pool
): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Deleting idea from database', { ideaId });

    // Get tags before deletion for usage count update
    const tagsQuery = `
      SELECT tags FROM metadata_records WHERE idea_id = $1
    `;
    const tagsResult = await client.query(tagsQuery, [ideaId]);
    const tags = tagsResult.rows[0]?.tags || [];

    // Delete artifacts
    await client.query('DELETE FROM artifacts WHERE idea_id = $1', [ideaId]);

    // Delete metadata
    await client.query('DELETE FROM metadata_records WHERE idea_id = $1', [
      ideaId,
    ]);

    // Delete idea
    await client.query('DELETE FROM ideas WHERE id = $1', [ideaId]);

    // Update tag usage counts
    for (const tag of tags) {
      await client.query(
        `UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE name = $1`,
        [tag]
      );
    }

    await client.query('COMMIT');

    logger.info('Idea deleted from database', { ideaId });

    return true;
  } catch (error) {
    await client.query('ROLLBACK');

    logger.error('Database deletion failed', {
      ideaId,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  } finally {
    client.release();
  }
}
