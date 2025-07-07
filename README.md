<p align="center">
	<h1 align="center"><b>Calibrator</b></h1>
<p align="center">
    Streamline your camera calibrations
    <br />
    <br />
    <a href="">Discord</a>
    ·
    <a href="">Website</a>
    ·
    <a href="https://github.com/alvgaona/calibrator/issues">Issues</a>
  </p>
</p>

## About Calibrator

WIP

## Architecture

This monorepo contains three Cloudflare Workers:

- **`apps/edge`** - Main calibration API worker (TypeScript)
- **`apps/upload`** - File upload service with S3 integration (TypeScript)
- **`apps/unpack`** - File processing worker (Rust)

## Development

This project uses [Turbo](https://turbo.build/) for efficient monorepo task management and caching.

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare Workers CLI)

### Getting Started

```bash
# Install dependencies
bun install

# Generate Cloudflare Workers types
bun run cf-typegen

# Start development servers for all workers
bun run dev

# Run tests across all packages
bun run test

# Build all packages
bun run build
```

### Available Scripts

**Development:**
- `bun run dev` - Start development servers for all workers
- `bun run dev:edge` - Start development server for edge worker only
- `bun run dev:upload` - Start development server for upload worker only
- `bun run dev:unpack` - Start development server for unpack worker only

**Building:**
- `bun run build` - Build all packages
- `bun run build:edge` - Build edge worker only
- `bun run build:upload` - Build upload worker only
- `bun run build:unpack` - Build unpack worker only

**Testing & Quality:**
- `bun run test` - Run tests across all packages
- `bun run lint` - Lint code across all packages
- `bun run typecheck` - Type check TypeScript code across all packages
- `bun run format` - Format code with Biome

**Deployment:**
- `bun run deploy` - Deploy all workers (runs build, test, and lint first)
- `bun run start:edge` - Start edge worker in production mode
- `bun run start:upload` - Start upload worker in production mode
- `bun run start:unpack` - Start unpack worker in production mode

**Utilities:**
- `bun run cf-typegen` - Generate Cloudflare Workers TypeScript types
- `bun run clean` - Clean node_modules
- `bun run clean:workspaces` - Clean all workspace build artifacts

### Working with Individual Apps

Use the dedicated scripts for working with individual apps:

```bash
# Development
bun run dev:edge     # Start edge worker dev server
bun run dev:upload   # Start upload worker dev server
bun run dev:unpack   # Start unpack worker dev server

# Building
bun run build:edge   # Build edge worker only
bun run build:upload # Build upload worker only
bun run build:unpack # Build unpack worker only

# Advanced filtering (alternative approach)
bun run test --filter=@calibrator/upload
bun run build --filter=@calibrator/edge
```

### Turbo Features

- **Caching**: Turbo caches task outputs to speed up subsequent runs
- **Parallelization**: Tasks run in parallel when possible
- **Dependency Management**: Tasks run in the correct order based on dependencies
- **Incremental Builds**: Only rebuild what's changed

The cache is stored in `.turbo/` and is gitignored. For CI/CD, consider using [Turbo Remote Cache](https://turbo.build/repo/docs/core-concepts/remote-caching) for even faster builds.
