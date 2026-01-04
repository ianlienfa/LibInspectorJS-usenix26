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
    python test_run.py --action=<detection|vuln_db|graph_gen|analysis> --test=<path>

The script automatically runs all prerequisite phases before the specified action.

Examples:
    # Test library detection (runs: crawl + detection)
    python test_run.py --action=detection --test=integration_test/lib_detection/test_lodash

    # Test vulnerability database query (runs: crawl + detection + vuln_db)
    python test_run.py --action=vuln_db --test=integration_test/vuln_db_query/test_jquery_vuln

    # Test static analysis (runs: crawl + detection + vuln_db + graph_gen)
    python test_run.py --action=graph_gen --test=unit_test/static_query/test_get_parent

    # Test full analysis pipeline (runs: crawl + detection + vuln_db + graph_gen + analysis)
    python test_run.py --action=analysis --test=integration_test/taint_analysis/test_xss

    # Skip setup if previous phase has been executed (runs: analysis)
    python test_run.py --action=analysis --test=integration_test/taint_analysis/test_xss --skip-setup

    # Keep Neo4j docker container alive for debugging
    python test_run.py --action=analysis --test=integration_test/taint_analysis/test_xss --keep-alive
"""

import sys
import json
import yaml
import argparse
import subprocess
import time
import threading
from pathlib import Path
from contextlib import contextmanager
from flask import Flask, send_from_directory, redirect, request       
import debugpy

# Add parent directory to path for imports
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from test_phases import test_detection, test_vuln_db, test_graph_gen, test_analysis


# Action definitions - maps action to required phases
ACTIONS = {
    'crawl': ['crawling'],
    'detection': ['crawling', 'lib_detection'],
    'vuln_db': ['crawling', 'lib_detection', 'vuln_db'],
    'graph_gen': ['crawling', 'lib_detection', 'vuln_db', 'static'],
    'analysis': ['crawling', 'lib_detection', 'vuln_db', 'static', 'static_neo4j']
}

# Phase to test function mapping
PHASE_TESTS = {
    'lib_detection': 'test_detection',
    'vuln_db': 'test_vuln_db',
    'static': 'test_graph_gen',
    'static_neo4j': 'test_analysis'
}


class TestWebServer:
    """Flask-based HTTP server for hosting test files at a specific URL path"""

    def __init__(self, directory, port=3000):
        self.directory = Path(directory).resolve()
        self.port = port
        # Extract URL path from directory structure        
        self.url_path = get_url_path_from_test_dir(self.directory)
        print("self.url_path", self.url_path, "self.directory", self.directory)

        self.app = Flask(
            __name__,
            static_folder=self.directory,
            static_url_path=self.url_path
        )

        @self.app.route(f'{self.url_path}/')
        @self.app.route(f'{self.url_path}')
        def serve_index():
            print("Serving index for", self.url_path)
            return redirect(f'{self.url_path}/index.html')

        # @self.app.route(f'/')        
        # def serve_root():
        #     # Return a simple message at root
        #     return "Test server is running"

    def start(self):
        """Start the Flask server in a background thread"""
        self.thread = threading.Thread(
            target=lambda: self.app.run(host='0.0.0.0', port=self.port, debug=False, use_reloader=False),
            daemon=True
        )
        self.thread.start()
        print(f"Test server started at http://localhost:{self.port}{self.url_path}")
        time.sleep(1)  # Give server time to start

    def stop(self):
        """Stop the web server"""
        # Flask's development server doesn't have a clean shutdown mechanism
        # The daemon thread will terminate when the main program exits
        print(f"  Test server stopped")


@contextmanager
def test_server(directory, port=3000):
    """Context manager for test web server"""
    server = TestWebServer(directory, port)
    try:
        server.start()
        yield server
    finally:
        server.stop()


def get_url_path_from_test_dir(test_dir):
    parts = test_dir.parts
    st_idx = parts.index('sites')
    end_idx = parts.index('dist')
    url_path = '/' + '/'.join(parts[st_idx+1:end_idx])
    return url_path



def get_test_config_path(dist_dir):
    """Get path for test-specific config file"""
    parts = dist_dir.parts
    parent = Path(*parts[:parts.index('dist')])
    return parent / 'config.yaml'


def generate_test_config(test_dir, action, port=3000, config_path='config.yaml', skip_setup=False, keep_alive=False):
    """
    Generate test-specific config.yaml file by loading an existing config and updating it.

    Args:
        test_dir: Path to the test dist directory
        test_name: Name of the test (for config file naming)
        action: Action to test (crawl, detection, graph_gen, analysis)
        port: Port number for test server
        url_path: URL path for the test (e.g., /tests/pipeline_test/sites/...)
        config_path: Path to base config.yaml to load
        skip_setup: If True, skip ACTIONS.get and use empty phases list
        keep_alive: If True, keep Neo4j docker container alive after run

    Returns:
        Path to generated config file
    """
    output_config_path = get_test_config_path(test_dir)

    # Load existing config
    base_config_file = BASE_DIR / config_path
    if base_config_file.exists():
        with open(base_config_file, 'r') as f:
            config = yaml.safe_load(f)
    else:
        print(f"Warning: Base config not found at {base_config_file}, using defaults")
        config = {}

    # get url path for config
    url_path = get_url_path_from_test_dir(test_dir)

    # Determine which phases to enable based on action
    phases_to_run = ACTIONS.get(action, [])
    phases_to_run = phases_to_run[-1:] if skip_setup else phases_to_run
    print("Phases to run: ", phases_to_run)

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
    config['cve_vuln']['passes']['vulndb'] = 'vuln_db' in phases_to_run
    config['cve_vuln']['passes']['static'] = 'static' in phases_to_run
    config['cve_vuln']['passes']['static_neo4j'] = 'static_neo4j' in phases_to_run

    if 'crawler' not in config:
        config['crawler'] = {}
    if 'lib_detection' not in config['crawler']:
        config['crawler']['lib_detection'] = {}
    config['crawler']['lib_detection']['enable'] = 'lib_detection' in phases_to_run

    # Remove proxy from headless browsers
    if config['crawler'].get('playwright', {}).get('proxy', {}):
        del config['crawler']['playwright']['proxy']
    if config['crawler'].get('puppeteer', {}).get('proxy-server', {}):
        del config['crawler']['puppeteer']['proxy-server']

    # Set keep_docker_alive option
    if 'staticpass' not in config:
        config['staticpass'] = {}
    config['staticpass']['keep_docker_alive'] = keep_alive

    # Disable isLibrary/isCdn skips
    config['staticpass']['debug'] = True

    # Override container_transaction_timeout to 3 hours for tests
    config['staticpass']['container_transaction_timeout'] = 10800  # 3 hours in seconds

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


def load_expected_answers(test_dir):
    """
    Load expected answers from ans.json file.

    Args:
        test_dir: Path to test directory

    Returns:
        Dictionary with expected answers for each phase, or None if file not found
    """
    ans_file = test_dir.parent / 'ans.json'

    if not ans_file.exists():
        print(f"Warning: ans.json not found at {ans_file}")
        return None

    try:
        with open(ans_file, 'r') as f:
            answers = json.load(f)
        return answers
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse ans.json: {e}")
        return None


def get_data_dir_from_test(test_dir):
    """
    Get the pipeline data directory for a test.

    Args:
        test_dir: Path to test dist directory

    Returns:
        Path to data directory or None
    """
    # Construct URL path from test directory
    url_path = get_url_path_from_test_dir(test_dir)
    # Remove leading slash and replace slashes with empty string to match data dir naming
    url_dir_name = f"http-localhost-3000{url_path.replace('/', '')}"

    # Data directory is at BASE_DIR/data/
    data_base = BASE_DIR / 'data' / url_dir_name

    if not data_base.exists():
        return None

    return data_base


def compare_results(test_dir, action):
    """
    Compare pipeline results against expected answers.

    Args:
        test_dir: Path to test directory
        action: Action that was run (determines which tests to execute)

    Returns:
        True if all applicable tests pass, False otherwise
    """
    # Load expected answers
    expected_answers = load_expected_answers(test_dir)
    if expected_answers is None:
        print("  Skipping result comparison (no ans.json found)")
        return True

    # Get actual pipeline output directory
    actual_data_dir = get_data_dir_from_test(test_dir)
    if not actual_data_dir:
        print("  Warning: Could not find pipeline data directory")
        return True

    # Determine which test functions to run based on action
    phases_to_test = ACTIONS.get(action, [])

    all_passed = True
    test_results = []

    # Run applicable test functions
    if 'lib_detection' in phases_to_test and 'detection' in expected_answers:
        success, msg = test_detection(expected_answers['detection'], actual_data_dir)
        test_results.append(('detection', success, msg))
        all_passed = all_passed and success

    if 'vuln_db' in phases_to_test and 'vuln_db' in expected_answers:
        success, msg = test_vuln_db(expected_answers['vuln_db'], actual_data_dir)
        test_results.append(('vuln_db', success, msg))
        all_passed = all_passed and success

    if 'static' in phases_to_test and 'graph_gen' in expected_answers:
        success, msg = test_graph_gen(expected_answers['graph_gen'], actual_data_dir)
        test_results.append(('graph_gen', success, msg))
        all_passed = all_passed and success

    if 'static_neo4j' in phases_to_test and 'analysis' in expected_answers:
        success, msg = test_analysis(expected_answers['analysis'], actual_data_dir)
        test_results.append(('analysis', success, msg))
        all_passed = all_passed and success

    # Print test results
    print("\n  Test Results:")
    for phase, success, msg in test_results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"    {status} - {phase}: {msg}")

    return all_passed


def run_pipeline(config_path, timeout=1200):
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
        command = ' '.join(['python3', str(pipeline_script), f'--conf={config_path}'])
        print("command: ", command)
        result = subprocess.run(
            ['python3', str(pipeline_script), f'--conf={config_path}'],
            cwd=BASE_DIR,
            timeout=timeout,            
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


def get_test_dir(test_path: str) -> Path | None:
    """
    Returns the path to dist/ given parital path to the test directory

    Args:
        test_path: Path to test directory (could be abosolute path or relative to sites/)

    Returns:
        Path object if successful, Path("") otherwise
    """

    test_path_split = Path(test_path).parts
    relative_path = Path(test_path)
    try:
        start_idx = test_path_split.index('sites')
        try:
            end_idx = test_path_split.index('dist')
        except Exception:
            end_idx = None

        relative_path = Path(*test_path_split[start_idx+1:]) if end_idx is None else Path(*test_path_split[start_idx+1:end_idx])
    except Exception:
        pass  # no 'sites' in the path

    test_dir = Path(__file__).parent / 'sites' / relative_path / 'dist'

    if not test_dir.exists():
        print(f"Error: Test directory not found: {test_dir}")
        return Path("")
    
    return test_dir


def run_test(test_path, action, port=3000, base_config='config.yaml', skip_setup=False, keep_alive=False):
    """
    Run a single test through the pipeline.

    Args:
        test_path: Path to test directory (relative to sites/)
        action: Action to test (crawl, detection, graph_gen, analysis)
        port: Port for test server
        base_config: Base config file to load
        skip_setup: If True, skip ACTIONS.get and use empty phases list
        keep_alive: If True, keep Neo4j docker container alive after run

    Returns:
        True if successful, False otherwise
    """

    if not (test_dir := get_test_dir(test_path)):
        return False

    dist_dir = test_dir
    if not dist_dir.exists():
        print(f"Error: dist/ directory not found in {test_dir}")
        print(f"  Run test_prep.py first to build distribution files")
        return False

    print(f"\nRunning test: {test_path}")
    print(f"  Testing action: {action}")

    # Generate test config
    config_path = generate_test_config(test_dir, action, port, base_config, skip_setup, keep_alive)

    # Start test server and run pipeline
    with test_server(dist_dir, port):
        pipeline_success = run_pipeline(config_path, timeout=3600)  # 1 hour timeout

    if not pipeline_success:
        print("  Pipeline execution failed")
        return False

    # Compare results against expected answers
    comparison_success = compare_results(test_dir, action)

    return pipeline_success and comparison_success

def host_server(test_path, port=3000):
    """Host test server indefinitely for manual testing."""
    if not (test_dir := get_test_dir(test_path)):
        exit(1)

    with test_server(test_dir, port):
        while True:
            pass  # let server work

def main():
    parser = argparse.ArgumentParser(
        description='Run pipeline tests',
        epilog='The script automatically runs all prerequisite phases before the specified action.'
    )
    parser.add_argument(
        '--action',
        type=str,
        required=True,
        choices=['crawl', 'detection', 'vuln_db', 'graph_gen', 'analysis'],
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
    parser.add_argument(
        '--server-only',
        default=False,
        help='Only hosts the server corresponds to this test'
    )
    parser.add_argument(
        '--skip-setup',
        action='store_true',
        default=False,
        help='Skip ACTIONS.get and use empty phases list (only runs if False)'
    )
    parser.add_argument(
        '--keep-alive',
        action='store_true',
        default=False,
        help='Keep Neo4j docker container alive after run (default: cleanup)'
    )


    args = parser.parse_args()
    if args.server_only:
        host_server(args.test, args.port)
    else:        
        success = run_test(args.test, args.action, args.port, args.config, args.skip_setup, args.keep_alive)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    # debugpy.listen(5678)
    # print("Waiting for debugger attach...")
    # debugpy.wait_for_client()
    main()
