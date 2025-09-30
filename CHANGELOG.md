# Changelog

All notable changes to GenAss will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Interactive AI-powered session with context caching
- Visual dropdown menu for slash commands (type `/` and press Enter)
- TAB autocomplete for slash commands
- 12 pre-engineered slash commands (/scan, /logo, /icons, etc.)
- Persistent context storage in AGENTS.md
- Smart AI-powered filename generation (short, contextual names)
- Automatic code injection with ready-to-copy import statements
- Existing asset detection - skips duplicates automatically
- Rich CLI prompt showing project:git:(branch) • ai:(model)
- Task tracking with visual checklists for all operations
- /inject command to show code snippets for using assets
- /regenerate command to force regeneration of all assets
- Strict asset-only scope with guardrails

### Changed
- Default mode is now interactive (run `genass` without arguments)
- Configuration is now optional with smart framework-specific defaults
- Filenames are now short and semantic (e.g., `app-logo.png` instead of long generated names)
- Quality check only validates dimensions when specified (fixes null errors)

### Fixed
- "nullxnull" in filenames when dimensions not specified
- ENOENT errors from malformed filenames
- Dimension validation bugs in quality checks
- Model version mismatch in .env.example (updated to gemini-2.5-flash-image-preview)

## [1.0.0] - 2025-09-29

### Added
- Initial release
- Codebase scanning with multi-agent AI analysis
- Asset generation using Nano Banana (Gemini 2.5 Flash Image)
- Support for logos, icons, banners, illustrations, favicons, social media assets
- Framework detection (React, Next.js, Vue, Angular, Svelte)
- Quality validation and auto-regeneration
- Batch processing with concurrent generation
- Cost estimation and transparency
- Platform-specific asset generation (PWA, app icons)
- MIT License
- Comprehensive documentation

### Infrastructure
- TypeScript codebase
- Google Gemini API integration
- Sharp for image processing
- Commander.js for CLI
- Inquirer for interactive prompts
- Chalk for colored output
- Ora for spinners
- Winston for logging