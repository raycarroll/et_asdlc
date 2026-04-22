# Ideas Registry

This directory contains published ideas from the idea workflow system.

## Structure

Each idea is stored in its own subdirectory with the following format:

```
ideas/
  ├── YYYYMMDD-HHMMSS-idea-slug/
  │   ├── spec.md              # Main specification
  │   ├── artifacts/           # Supporting files (optional)
  │   └── metadata.json        # System metadata
```

## Publishing

Ideas are published using the `/expand-idea` command, which:
1. Validates the idea through guided questions
2. Generates a specification from templates
3. Commits to this repository
4. Registers in the central database

## Viewing Ideas

Browse ideas directly in this directory or query the database for:
- Search by tags/categories
- Filter by status (draft, published, implemented)
- Find ideas by author

## Metadata

Each idea includes:
- **Title**: Short description
- **Author**: User who created the idea
- **Status**: draft, published, in-progress, implemented, rejected
- **Created/Updated**: Timestamps
- **Tags**: Searchable keywords
- **Git Commit**: SHA linking to this repository
