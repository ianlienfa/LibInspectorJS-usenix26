#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test Runner Script
------------------
Orchestrates pipeline testing by:
1. Generating test-specific config.yaml
2. Hosting test websites temporarily
3. Running pipeline phases up to the specified action
4. Comparing results against expected answers

Usage:
    python test_run.py --action=<detection|graph_gen|analysis> --test=<path>

The script automatically runs all prerequisite phases before the specified action.

Examples:
    # Test library detection (runs: crawl + detection)
    python test_run.py --action=detection --test=integration_test/lib_detection/test_lodash

    # Test static analysis (runs: crawl + detection + graph_gen)
    python test_run.py --action=graph_gen --test=unit_test/static_query/test_get_parent

    # Test full analysis pipeline (runs: crawl + detection + graph_gen + analysis)
    python test_run.py --action=analysis --test=integration_test/taint_analysis/test_xss
"""

import os
import sys
import yaml
import argparse
import subprocess
import shutil
import time
import threading
import http.server
import socketserver
from pathlib import Path
from contextlib import contextmanager

# Add parent directory to path for imports
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import utils.io as IOModule


# Action definitions - maps action to required phases
ACTIONS = {
    'crawl': ['crawling'],
    'detection': ['crawling', 'lib_detection'],
    'graph_gen': ['crawling', 'lib_detection', 'static'],
    'analysis': ['crawling', 'lib_detection', 'static', 'static_neo4j']
}


class TestWebServer:
    """Simple HTTP server for hosting test files at a specific URL path"""

    def __init__(self, directory, port=3000, url_path=''):
        self.directory = Path(directory).resolve()
        self.port = port
        self.url_path = '/' + url_path.strip('/')
        self.httpd = None
        self.thread = None

    def start(self):
        """Start the web server in a background thread"""
        directory = self.directory
        url_path = self.url_path

        class CustomHandler(http.server.SimpleHTTPRequestHandler):
            def translate_path(self, path):
                """Override to handle custom URL paths"""
                # Check if the request path starts with our url_path
                if path.startswith(url_path):
                    # Strip the url_path prefix
                    path = path[len(url_path):]
                    if not path or path == '/':
                        path = '/index.html'
                    # Serve from our directory
                    path = path.lstrip('/')
                    return str(directory / path)
                else:
                    # Return a path that doesn't exist to trigger 404
                    return str(directory / '__nonexistent__')

            def log_message(self, format, *args):
                """Suppress log messages"""
                pass

        # Create server
        self.httpd = socketserver.TCPServer(("", self.port), CustomHandler)

        # Start in background thread
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

        print(f"  Test server started at http://localhost:{self.port}{self.url_path}")
        time.sleep(1)  # Give server time to start

    def stop(self):
        """Stop the web server"""
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            print(f"  Test server stopped")


@contextmanager
def test_server(directory, port=3000, url_path=''):
    """Context manager for test web server"""
    server = TestWebServer(directory, port, url_path)
    try:
        server.start()
        yield server
    finally:
        server.stop()


def get_test_config_path(test_name):
    """Get path for test-specific config file"""
    test_safe_name = test_name.replace('/', '_').replace('\\', '_')
    return Path(__file__).parent / f'config_{test_safe_name}.yaml'


def generate_test_config(test_dir, test_name, action, port=3000, url_path='', config_path='config.yaml'):
    """
    Generate test-specific config.yaml file by loading an existing config and updating it.

    Args:
        test_dir: Path to test directory
        test_name: Name of the test (for config file naming)
        action: Action to test (crawl, detection, graph_gen, analysis)
        port: Port number for test server
        url_path: URL path for the test (e.g., /tests/pipeline_test/sites/...)
        config_path: Path to base config.yaml to load

    Returns:
        Path to generated config file
    """
    output_config_path = get_test_config_path(test_name)

    # Load existing config
    base_config_file = BASE_DIR / config_path
    if base_config_file.exists():
        with open(base_config_file, 'r') as f:
            config = yaml.safe_load(f)
    else:
        print(f"Warning: Base config not found at {base_config_file}, using defaults")
        config = {}

    # Determine which phases to enable based on action
    phases_to_run = ACTIONS.get(action, [])

    # Update only the fields related to input arguments
    if 'testbed' not in config:
        config['testbed'] = {}
    config['testbed']['site'] = f'http://localhost:{port}{url_path}'

    if 'cve_vuln' not in config:
        config['cve_vuln'] = {}
    if 'passes' not in config['cve_vuln']:
        config['cve_vuln']['passes'] = {}

    config['cve_vuln']['passes']['crawling'] = 'crawling' in phases_to_run
    config['cve_vuln']['passes']['lib_detection'] = 'lib_detection' in phases_to_run
    config['cve_vuln']['passes']['static'] = 'static' in phases_to_run
    config['cve_vuln']['passes']['static_neo4j'] = 'static_neo4j' in phases_to_run

    if 'crawler' not in config:
        config['crawler'] = {}
    if 'lib_detection' not in config['crawler']:
        config['crawler']['lib_detection'] = {}
    config['crawler']['lib_detection']['enable'] = 'lib_detection' in phases_to_run

    # Write config file
    with open(output_config_path, 'w') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    print(f"  Generated config: {output_config_path}")
    return output_config_path


def should_skip_phase(test_dir, phase):
    """
    Check if phase should be skipped (because output already exists).

    Args:
        test_dir: Path to test directory
        phase: Phase name (crawling, lib_detection, etc.)

    Returns:
        True if phase can be skipped, False otherwise
    """
    # For now, always run phases (can be optimized later)
    # TODO: Implement smart detection of existing outputs
    return False


def run_pipeline(config_path, timeout=600):
    """
    Run the pipeline with given config.

    Args:
        config_path: Path to config file
        timeout: Timeout in seconds

    Returns:
        True if successful, False otherwise
    """
    pipeline_script = BASE_DIR / 'run_pipeline.py'

    try:
        print(f"  Running pipeline...")
        result = subprocess.run(
            ['python3', str(pipeline_script), f'--conf={config_path}'],
            cwd=BASE_DIR,
            timeout=timeout,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print(f"  Pipeline completed successfully")
            return True
        else:
            print(f"  Pipeline failed with return code {result.returncode}")
            if result.stderr:
                print(f"  stderr: {result.stderr[:500]}")
            return False

    except subprocess.TimeoutExpired:
        print(f"  Pipeline timeout after {timeout}s")
        return False
    except Exception as e:
        print(f"  Pipeline error: {e}")
        return False


def run_test(test_path, action, port=3000, base_config='config.yaml'):
    """
    Run a single test through the pipeline.

    Args:
        test_path: Path to test directory (relative to sites/)
        action: Action to test (crawl, detection, graph_gen, analysis)
        port: Port for test server
        base_config: Base config file to load

    Returns:
        True if successful, False otherwise
    """
    test_dir = Path(__file__).parent / 'sites' / test_path

    if not test_dir.exists():
        print(f"Error: Test directory not found: {test_dir}")
        return False

    dist_dir = test_dir / 'dist'
    if not dist_dir.exists():
        print(f"Error: dist/ directory not found in {test_dir}")
        print(f"  Run test_prep.py first to build distribution files")
        return False

    ans_file = test_dir / 'ans.txt'
    if not ans_file.exists():
        print(f"Warning: ans.txt not found in {test_dir}")

    print(f"\nRunning test: {test_path}")
    print(f"  Testing action: {action}")
    print(f"  Phases to run: {ACTIONS.get(action, [])}")

    # Generate URL path from test path
    # e.g., integration_test/lib_detection/test_lodash -> /tests/pipeline_test/sites/integration_test/lib_detection/test_lodash
    url_path = f"/tests/pipeline_test/sites/{test_path}"

    # Generate test config
    config_path = generate_test_config(test_dir, test_path, action, port, url_path, base_config)

    # Start test server and run pipeline
    with test_server(dist_dir, port, url_path):
        success = run_pipeline(config_path, timeout=600)

    if not success:
        return False

    # TODO: Compare results against ans.txt
    print(f"  Test completed (result comparison not implemented yet)")

    return True


def main():
    parser = argparse.ArgumentParser(
        description='Run pipeline tests',
        epilog='The script automatically runs all prerequisite phases before the specified action.'
    )
    parser.add_argument(
        '--action',
        type=str,
        required=True,
        choices=['crawl', 'detection', 'graph_gen', 'analysis'],
        help='Action to test (automatically runs all prerequisite phases)'
    )
    parser.add_argument(
        '--test',
        type=str,
        required=True,
        help='Test path relative to sites/ (e.g., integration_test/lib_detection/test_lodash)'
    )
    parser.add_argument(
        '--port',
        type=int,
        default=3000,
        help='Port for test web server (default: 3000)'
    )
    parser.add_argument(
        '--config',
        type=str,
        default='config.yaml',
        help='Base config file to load (default: config.yaml)'
    )

    args = parser.parse_args()

    success = run_test(args.test, args.action, args.port, args.config)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
