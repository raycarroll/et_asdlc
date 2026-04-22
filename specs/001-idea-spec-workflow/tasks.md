# Tasks: Idea Validation and Spec Generation Workflow

**Input**: Design documents from `/specs/001-idea-spec-workflow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No test tasks included - not explicitly requested in feature specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`
- **Frontend**: `frontend/src/`
- **Skills**: `.claude/skills/`
- **Shared**: `shared/`
- **Templates**: `templates/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create monorepo structure with backend/, frontend/, shared/, templates/ directories per plan.md
- [x] T002 Initialize Node.js projects in backend/ with TypeScript, Express.js dependencies from research.md
- [x] T003 [P] Initialize Node.js projects in frontend/ with TypeScript, React, Next.js dependencies from research.md
- [x] T004 [P] Initialize shared/ package with TypeScript for cross-platform types
- [x] T005 [P] Configure linting (ESLint) and formatting (Prettier) tools across all packages
- [x] T006 [P] Setup Git repository structure for templates/ directory per contracts/git-repository.md
- [x] T007 Create package.json workspace configuration for monorepo dependency management

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Setup PostgreSQL database schema and migrations framework in backend/src/db/
- [x] T009 Create database schema SQL in backend/src/db/schema.sql based on data-model.md (User, Idea, MetadataRecord, Artifact, Tag, IdeaTag, ConversationSession, Template, TemplateUpdateCache tables)
- [x] T010 [P] Create shared type definitions in shared/types/idea.ts for Idea entity from data-model.md
- [x] T011 [P] Create shared type definitions in shared/types/template.ts for Template entity from data-model.md
- [x] T012 [P] Create shared type definitions in shared/types/api.ts for API request/response contracts from contracts/api.md
- [x] T013 [P] Create shared type definitions in shared/types/session.ts for ConversationSession from data-model.md
- [x] T014 Implement JWT authentication service in backend/src/services/auth/jwt.ts using jsonwebtoken library from research.md
- [x] T015 Implement authentication middleware in backend/src/api/middleware/auth.ts that validates JWT tokens and extracts user/role claims per FR-001
- [x] T016 [P] Configure Express.js API server in backend/src/api/index.ts with routing and middleware structure
- [x] T017 [P] Setup error handling middleware in backend/src/api/middleware/error.ts per FR-017
- [x] T018 [P] Setup logging infrastructure in backend/src/utils/logger.ts
- [x] T019 [P] Setup environment configuration management in backend/src/config/env.ts for database, JWT, git repository URLs from quickstart.md
- [x] T020 Implement Git operations utility in shared/utils/git.ts using simple-git library from research.md

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Validate and Expand Raw Idea (Priority: P1) 🎯 MVP

**Goal**: Enable users to run `/expand_idea` command to validate ideas through guided prompts and generate specifications

**Independent Test**: Run `/expand_idea <description>`, answer validation questions, verify spec.md is generated with all mandatory sections

### Implementation for User Story 1

- [x] T021 [P] [US1] Create ConversationSession model in backend/src/models/session.ts based on data-model.md
- [x] T022 [P] [US1] Create User model in backend/src/models/user.ts based on data-model.md
- [x] T023 [P] [US1] Create validation guideline YAML schema in templates/validation-guidelines/default.yml per contracts/git-repository.md
- [x] T024 [P] [US1] Create spec template Markdown with Handlebars placeholders in templates/spec-templates/default.md per contracts/git-repository.md
- [x] T025 [US1] Implement validation guideline loader service in backend/src/services/validation/guideline-loader.ts to load YAML files from templates/ (FR-003)
- [x] T026 [US1] Implement question presenter service in backend/src/services/validation/question-presenter.ts to format questions from guidelines (FR-004)
- [x] T027 [US1] Implement conversation manager service in backend/src/services/validation/conversation-manager.ts to track state and handle follow-ups (FR-005, FR-006)
- [x] T028 [US1] Implement session persistence service in backend/src/services/validation/session-storage.ts to save/load session state files in ~/.claude/idea-workflow/sessions/ (FR-006)
- [x] T029 [US1] Implement template rendering service in backend/src/services/template/renderer.ts using Handlebars library from research.md (FR-007, FR-008)
- [x] T030 [US1] Create Claude Code skill definition in .claude/skills/expand-idea/skill.md per contracts/command.md
- [x] T031 [US1] Implement skill handler in .claude/skills/expand-idea/handler.ts that orchestrates validation workflow (FR-002 through FR-008)
- [x] T032 [US1] Add session cleanup worker in backend/src/workers/session-cleanup.ts to remove expired sessions per FR-016
- [x] T033 [US1] Add error handling and retry logic in .claude/skills/expand-idea/handler.ts per FR-017

**Checkpoint**: At this point, User Story 1 should be fully functional - users can run `/expand_idea` and generate specifications

---

## Phase 4: User Story 2 - Publish Idea to Central Repository (Priority: P2)

**Goal**: Enable publishing completed specs to git repository with atomic database registration

**Independent Test**: Generate a spec, trigger publish, verify spec appears in git repository AND database with metadata

### Implementation for User Story 2

- [x] T034 [P] [US2] Create Idea model in backend/src/models/idea.ts based on data-model.md
- [x] T035 [P] [US2] Create MetadataRecord model in backend/src/models/metadata.ts based on data-model.md
- [x] T036 [P] [US2] Create Artifact model in backend/src/models/artifact.ts based on data-model.md
- [x] T037 [P] [US2] Create Tag model in backend/src/models/tag.ts based on data-model.md
- [x] T038 [US2] Implement git publishing service in backend/src/services/publishing/git-publisher.ts to commit and push specs to git repository (FR-009)
- [x] T039 [US2] Implement metadata extraction service in backend/src/services/publishing/metadata-extractor.ts to parse specs and extract structured fields (FR-009a)
- [x] T040 [US2] Implement database registration service in backend/src/services/publishing/db-registrar.ts to store metadata records (FR-009a)
- [x] T041 [US2] Implement atomic transaction coordinator in backend/src/services/publishing/transaction-coordinator.ts using Saga pattern from research.md (FR-009, FR-018, FR-019)
- [x] T042 [US2] Implement rollback handlers in backend/src/services/publishing/rollback.ts to revert git commits or database entries on failure (FR-018)
- [x] T043 [US2] Create POST /api/v1/ideas endpoint in backend/src/api/ideas.ts per contracts/api.md (FR-011)
- [x] T044 [US2] Add publish functionality to .claude/skills/expand-idea/handler.ts to call atomic publish service (FR-009, FR-010)
- [x] T045 [US2] Add token-based git credential helper integration in backend/src/services/auth/git-credentials.ts (FR-010)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can generate and publish specs atomically

---

## Phase 5: User Story 3 - Browse and View Ideas (Priority: P2)

**Goal**: Enable users to browse, filter, and view published ideas through a web UI

**Independent Test**: Publish multiple ideas, open UI, verify list appears with filters, click an idea to see full details

### Implementation for User Story 3

- [x] T046 [P] [US3] Create GET /api/v1/ideas endpoint in backend/src/api/ideas.ts with pagination, filtering, full-text search per contracts/api.md (FR-011, FR-011a, FR-011b, FR-014a)
- [x] T047 [P] [US3] Create GET /api/v1/ideas/:id endpoint in backend/src/api/ideas.ts to return detailed idea with metadata and artifacts per contracts/api.md (FR-014c, FR-014d)
- [x] T048 [US3] Implement search service in backend/src/services/search/search.ts using PostgreSQL full-text search (tsvector) from data-model.md (FR-011a, FR-014)
- [x] T049 [US3] Implement pagination service in backend/src/services/search/pagination.ts to handle page offsets and limits (FR-011b, FR-013a)
- [x] T050 [US3] Implement filter service in backend/src/services/search/filters.ts to combine AND/OR logic per FR-014a
- [x] T051 [P] [US3] Create API client service in frontend/src/services/api.ts to call backend endpoints
- [x] T052 [P] [US3] Create authentication service in frontend/src/services/auth.ts for token management and storage
- [x] T053 [P] [US3] Create IdeaList component in frontend/src/components/IdeaList.tsx to display paginated ideas (FR-013, FR-013a)
- [x] T054 [P] [US3] Create FilterPanel component in frontend/src/components/FilterPanel.tsx for author, status, tags, date filters (FR-014, FR-014a, FR-014b)
- [x] T055 [P] [US3] Create IdeaDetail component in frontend/src/components/IdeaDetail.tsx to display full specification and artifacts (FR-014c, FR-014d, FR-014e)
- [x] T056 [P] [US3] Create pagination controls component in frontend/src/components/Pagination.tsx (FR-013a, FR-013b)
- [x] T057 [P] [US3] Create Login page in frontend/src/pages/Login.tsx for authentication
- [x] T058 [US3] Create Browse page in frontend/src/pages/Browse.tsx integrating IdeaList, FilterPanel, and Pagination components (FR-012, FR-013)
- [x] T059 [US3] Create useIdeas hook in frontend/src/hooks/useIdeas.ts for idea queries with filters
- [x] T060 [US3] Create usePagination hook in frontend/src/hooks/usePagination.ts for pagination state management
- [x] T061 [US3] Add filter and page state preservation in frontend URL query params (FR-014b)

**Checkpoint**: At this point, all P2 user stories complete - users can generate, publish, and browse ideas

---

## Phase 6: User Story 4 - Manage Templates and Guidelines (Priority: P3)

**Goal**: Enable administrators to view and edit templates through the UI with validation and git commit

**Independent Test**: Login as admin, view templates, make edits, save, verify subsequent operations use updated templates

### Implementation for User Story 4

- [x] T062 [P] [US4] Create Template model in backend/src/models/template.ts based on data-model.md
- [x] T063 [P] [US4] Create GET /api/v1/templates endpoint in backend/src/api/templates.ts per contracts/api.md (FR-015b, FR-015c)
- [x] T064 [P] [US4] Create GET /api/v1/templates/:id endpoint in backend/src/api/templates.ts to return template content per contracts/api.md (FR-015d)
- [x] T065 [P] [US4] Create PUT /api/v1/templates/:id endpoint in backend/src/api/templates.ts to update templates per contracts/api.md (FR-015e, FR-015f)
- [x] T066 [US4] Implement role-based authorization middleware in backend/src/api/middleware/rbac.ts to check administrator role from token claims (FR-015a)
- [x] T067 [US4] Implement template validation service in backend/src/services/template/validator.ts for syntax validation (YAML/JSON/Markdown) (FR-015e, FR-015e-1, FR-015e-2)
- [x] T068 [US4] Implement template semantic validation in backend/src/services/template/semantic-validator.ts to check placeholders and structure (FR-015e, FR-015e-1, FR-015e-2)
- [x] T069 [US4] Implement template git commit service in backend/src/services/template/template-committer.ts to commit admin edits with identity tracking (FR-015f)
- [x] T070 [P] [US4] Create TemplateEditor component in frontend/src/components/TemplateEditor.tsx for viewing and editing templates (FR-015c, FR-015d)
- [x] T071 [P] [US4] Create TemplateList component in frontend/src/components/TemplateList.tsx to show available templates
- [x] T072 [US4] Create AdminTemplates page in frontend/src/pages/AdminTemplates.tsx integrating template list and editor (FR-015b)
- [x] T073 [US4] Add validation error display in TemplateEditor component showing syntax/semantic errors (FR-015e-1, FR-015e-2)
- [x] T074 [US4] Add admin-only route guards in frontend based on role claims from JWT token

**Checkpoint**: At this point, administrators can manage templates through UI with validation

---

## Phase 7: User Story 5 - Auto-Update Templates (Priority: P3)

**Goal**: Automatically check for and download template updates from central git repository

**Independent Test**: Install command, publish template updates to git, verify automatic download on next use or after 24 hours

### Implementation for User Story 5

- [x] T075 [P] [US5] Create TemplateUpdateCache model in backend/src/models/template-cache.ts based on data-model.md
- [x] T076 [US5] Implement template update checker service in backend/src/services/updates/update-checker.ts to fetch latest from git (FR-021, FR-022)
- [x] T077 [US5] Implement template cache service in backend/src/services/updates/cache.ts to track last check timestamp and enforce 24-hour interval (FR-023)
- [x] T078 [US5] Implement template download service in backend/src/services/updates/downloader.ts to fetch and overwrite local templates (FR-024, FR-025)
- [x] T079 [US5] Implement update notification service in backend/src/services/updates/notifier.ts to display update messages (FR-026, FR-028)
- [x] T080 [US5] Add update check on command installation in .claude/skills/expand-idea/handler.ts (FR-021)
- [x] T081 [US5] Add periodic update check (24-hour interval) in .claude/skills/expand-idea/handler.ts using cache service (FR-022, FR-023)
- [x] T082 [US5] Add graceful failure handling in update checker to continue with existing templates on network failures (FR-027, FR-027a, FR-027b, FR-029)
- [x] T083 [US5] Create template update worker in backend/src/workers/template-sync.ts for background updates per plan.md
- [x] T084 [US5] Add template version/commit tracking in template-cache.ts to show what was updated in notifications (FR-028)

**Checkpoint**: All user stories complete - system has full functionality including auto-updates

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T085 [P] Add comprehensive logging across all services in backend/src/services/ per FR-027a
- [x] T086 [P] Implement health check endpoint GET /api/v1/health in backend/src/api/health.ts per contracts/api.md
- [x] T087 [P] Add rate limiting middleware in backend/src/api/middleware/rate-limit.ts per contracts/api.md (1000/hour authenticated, 100/hour unauthenticated)
- [x] T088 [P] Configure CORS in backend/src/api/index.ts for frontend origin
- [ ] T089 [P] Add API error response standardization per contracts/api.md error format
- [ ] T090 [P] Implement token refresh endpoint POST /api/v1/auth/refresh per contracts/api.md (FR-020)
- [ ] T091 [P] Add token expiration handling in frontend/src/services/auth.ts with re-authentication prompts (FR-020)
- [ ] T092 [P] Create quickstart validation script to verify setup steps from quickstart.md
- [ ] T093 [P] Add database migration scripts in backend/src/db/migrations/ for all schema changes
- [ ] T094 [P] Create seed data script in backend/src/db/seed.ts for development/testing
- [ ] T095 [P] Setup environment variable validation on startup to catch configuration errors early
- [ ] T096 [P] Add git repository size monitoring and logging for artifact storage growth tracking
- [ ] T097 [P] Optimize full-text search queries with proper PostgreSQL indexes from data-model.md
- [ ] T098 [P] Add security headers middleware in backend/src/api/middleware/security.ts
- [ ] T099 Code cleanup and refactoring across all modules
- [ ] T100 Performance optimization across all user stories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - User Story 2 (Phase 4): Can start after Foundational - Integrates with US1 but independently testable
  - User Story 3 (Phase 5): Can start after Foundational - Integrates with US2 but independently testable
  - User Story 4 (Phase 6): Can start after Foundational - Independent of other stories
  - User Story 5 (Phase 7): Can start after Foundational - Independent of other stories
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - MVP standalone functionality
- **User Story 2 (P2)**: Extends US1 but independently testable by creating specs manually
- **User Story 3 (P2)**: Displays published ideas from US2 but can be tested with seed data
- **User Story 4 (P3)**: Independent template management - no dependencies on other stories
- **User Story 5 (P3)**: Independent template updates - no dependencies on other stories

### Within Each User Story

- Models before services
- Services before endpoints/handlers
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Services marked [P] can run in parallel if they don't depend on each other
- Frontend components marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create ConversationSession model in backend/src/models/session.ts"
Task: "Create User model in backend/src/models/user.ts"

# Launch template files together:
Task: "Create validation guideline YAML in templates/validation-guidelines/default.yml"
Task: "Create spec template Markdown in templates/spec-templates/default.md"
```

## Parallel Example: User Story 3

```bash
# Launch all frontend components together:
Task: "Create IdeaList component in frontend/src/components/IdeaList.tsx"
Task: "Create FilterPanel component in frontend/src/components/FilterPanel.tsx"
Task: "Create IdeaDetail component in frontend/src/components/IdeaDetail.tsx"
Task: "Create Pagination component in frontend/src/components/Pagination.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test `/expand_idea` command independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo (admin features)
6. Add User Story 5 → Test independently → Deploy/Demo (auto-updates)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1 - MVP)
   - Developer B: User Story 2 (P2 - Publishing)
   - Developer C: User Story 3 (P2 - UI)
   - Developer D: User Story 4 (P3 - Admin)
   - Developer E: User Story 5 (P3 - Updates)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- No test tasks included - not requested in specification (can be added later if needed)
