# JAW4C UI - Analysis Dashboard

A read-only web interface for visualizing and analyzing JAW4C (JavaScript Analysis for Vulnerabilities in Web Code) results.

## Features

- **Site Overview**: Browse all analyzed sites with key metrics
- **Filtering & Search**: Filter by flows, library detection, vulnerabilities, and logs
- **File Viewers**:
  - Syntax-highlighted JSON and log files
  - Table views for library detection results
  - Table views for vulnerability reports
- **Security**: All parsing happens server-side, client only receives sanitized HTML
- **Unified Color Theme**: Clean, modern interface with consistent styling

## Running with Docker

### Quick Start

1. **Build and run using docker-compose:**
   ```bash
   cd JAW4C-UI
   docker-compose up -d
   ```

2. **Access the UI:**
   Open your browser to http://localhost:3001

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Development Mode

The Docker setup automatically mounts your source code, so you can edit files and see changes without rebuilding:

- **Edit any source file** (server.js, public/*, views/*)
- **Restart the container** to see changes:
  ```bash
  docker-compose restart
  ```

Dependencies are installed during the image build, so they don't need to be reinstalled on every restart.

### When to Rebuild

You only need to rebuild the image when you:
- Change `package.json` (add/remove dependencies)
- Change the `Dockerfile` itself

```bash
docker-compose build
docker-compose up -d
```

For all other code changes (JS, CSS, HTML, EJS), just restart the container.

## Running Locally (Development)

```bash
# Install dependencies
npm install

# Start the server
node server.js

# Access at http://localhost:3001
```

## Architecture

### Server-Side Rendering
All file parsing and formatting happens on the server:
- JSON syntax highlighting
- Log file formatting
- Library detection table generation
- Vulnerability report table generation
- HTML sanitization

### Client-Side
The client only:
- Displays pre-formatted content
- Handles UI interactions (filters, search, toggles)
- Manages view state

This architecture ensures:
- **Security**: No client-side parsing of potentially malicious content
- **Performance**: Consistent rendering across all clients
- **Reliability**: Centralized parsing logic

## Data Directory Structure

The UI expects data in the following structure:
```
JAW4C-JAW/data/
├── <domain-hash>/
│   ├── <site-hash>/
│   │   ├── url.out
│   │   ├── lib.detection.json
│   │   ├── vuln.out
│   │   ├── sink.flows.out
│   │   ├── errors.log
│   │   ├── warnings.log
│   │   └── ...
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

## Technologies

- **Backend**: Node.js + Express
- **Templating**: EJS
- **Containerization**: Docker
- **Styling**: Custom CSS with CSS Variables
