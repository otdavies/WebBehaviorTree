# Behavior Tree Editor

A browser-based behavior tree editor with Monaco integration, built with TypeScript, HTML, and CSS.

https://otdavies.github.io/WebBehaviorTree/

## Features

- Visual behavior tree editor with drag-and-drop interface
- Monaco code editor for custom node logic
- Real-time execution and debugging
- Import/Export JSON functionality
- Blackboard system for shared state

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Serve locally
npm run serve
```

Then open http://localhost:8080 in your browser.

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and rebuild
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run serve` - Start local Python HTTP server

## Deployment

This project is configured to automatically deploy to GitHub Pages on every push to the `main` branch.

### GitHub Pages Setup

After cloning/forking this repository:

1. Go to your repository's **Settings**
2. Navigate to **Pages** (in the left sidebar)
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy on the next push to `main`
5. Your site will be available at: `https://<username>.github.io/<repository-name>/`

The deployment workflow:
- Installs Node.js and dependencies
- Builds the TypeScript code
- Deploys to GitHub Pages

See `.github/workflows/deploy.yml` for the full workflow configuration.

## Project Structure

```
.
├── src/                 # TypeScript source files
│   ├── actions/        # Action-related code
│   ├── core/           # Core behavior tree logic
│   ├── editor/         # Editor functionality
│   ├── nodes/          # Node implementations
│   ├── state/          # State management
│   ├── ui/             # UI components
│   └── utils/          # Utility functions
├── styles/             # CSS stylesheets
├── tests/              # Test files
├── dist/               # Compiled JavaScript (generated)
├── index.html          # Main HTML file
└── package.json        # Node.js dependencies and scripts
```

## License

MIT
