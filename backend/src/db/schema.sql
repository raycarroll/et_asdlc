-- Database Schema for Idea Validation and Spec Generation Workflow
-- Based on specs/001-idea-spec-workflow/data-model.md

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'administrator')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Ideas table
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL CHECK (LENGTH(title) >= 3),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  git_path VARCHAR(255) UNIQUE NOT NULL,
  git_commit_sha VARCHAR(40),
  CONSTRAINT check_published_at CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR
    (status != 'published' AND published_at IS NULL)
  )
);

CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_created_at ON ideas(created_at);
CREATE UNIQUE INDEX idx_ideas_git_path ON ideas(git_path);

-- Metadata Records table
CREATE TABLE metadata_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  summary TEXT NOT NULL CHECK (LENGTH(summary) BETWEEN 10 AND 250),
  goals TEXT,
  requirements TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  full_text_search TSVECTOR,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_max_tags CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20)
);

CREATE UNIQUE INDEX idx_metadata_idea_id ON metadata_records(idea_id);
CREATE INDEX idx_metadata_full_text_search ON metadata_records USING GIN(full_text_search);
CREATE INDEX idx_metadata_tags ON metadata_records USING GIN(tags);

-- Trigger to update full_text_search on insert/update
CREATE OR REPLACE FUNCTION update_full_text_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_text_search := to_tsvector('english',
    COALESCE(NEW.summary, '') || ' ' ||
    COALESCE(NEW.goals, '') || ' ' ||
    COALESCE(NEW.requirements, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_full_text_search
BEFORE INSERT OR UPDATE ON metadata_records
FOR EACH ROW EXECUTE FUNCTION update_full_text_search();

-- Artifacts table
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('specification', 'diagram', 'mockup', 'reference')),
  content_type VARCHAR(100),
  size_bytes INTEGER CHECK (size_bytes > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(idea_id, file_path)
);

CREATE INDEX idx_artifacts_idea_id ON artifacts(idea_id);
CREATE UNIQUE INDEX idx_artifacts_idea_file ON artifacts(idea_id, file_path);

-- Tags table (materialized view of normalized tags)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL CHECK (name ~ '^[a-z0-9-]{2,50}$'),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);

-- Idea-Tag join table (many-to-many)
CREATE TABLE idea_tags (
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idea_id, tag_id)
);

CREATE INDEX idx_idea_tags_idea_id ON idea_tags(idea_id);
CREATE INDEX idx_idea_tags_tag_id ON idea_tags(tag_id);

-- Conversation Sessions table
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_title VARCHAR(200),
  current_question_index INTEGER NOT NULL DEFAULT 0 CHECK (current_question_index >= 0),
  responses JSONB NOT NULL DEFAULT '{}',
  partial_spec TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT check_expires_at CHECK (expires_at >= created_at)
);

CREATE INDEX idx_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON conversation_sessions(expires_at);
CREATE INDEX idx_sessions_user_status ON conversation_sessions(user_id, status);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL CHECK (name ~ '^[a-zA-Z0-9_-]{3,100}$'),
  file_path VARCHAR(255) NOT NULL,
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('spec', 'guideline')),
  current_version_sha VARCHAR(40) NOT NULL CHECK (current_version_sha ~ '^[a-f0-9]{40}$'),
  last_sync_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_templates_name ON templates(name);
CREATE INDEX idx_templates_type ON templates(template_type);

-- Template Update Cache table
CREATE TABLE template_update_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  last_check_timestamp TIMESTAMP NOT NULL,
  last_successful_update TIMESTAMP,
  current_version_sha VARCHAR(40) NOT NULL CHECK (current_version_sha ~ '^[a-f0-9]{40}$'),
  next_check_due TIMESTAMP GENERATED ALWAYS AS (last_check_timestamp + INTERVAL '24 hours') STORED,
  CONSTRAINT check_successful_update CHECK (
    last_successful_update IS NULL OR last_successful_update <= last_check_timestamp
  )
);

CREATE INDEX idx_cache_next_check ON template_update_cache(next_check_due);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ideas_updated_at
BEFORE UPDATE ON ideas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_metadata_updated_at
BEFORE UPDATE ON metadata_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_sessions_updated_at
BEFORE UPDATE ON conversation_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
