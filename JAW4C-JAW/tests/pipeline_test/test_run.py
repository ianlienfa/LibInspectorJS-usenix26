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
        self.app = Flask(__name__)
        self.thread = None

        # Extract URL path from directory structure        
        self.url_path = get_url_path_from_test_dir(self.directory)
        print("self.url_path", self.url_path, "self.directory", self.directory)

        # Set up routes
        @self.app.route(f'{self.url_path}/')
        @self.app.route(f'{self.url_path}')
        def serve_index():
            return redirect(str(Path(self.url_path, 'index.html')), code=301)           


        @self.app.route(f'{self.url_path}/<path:suffix>')
        def serve_file(suffix):
            if suffix:            
                print("serve_file", self.directory / suffix)
                return send_from_directory(self.directory, suffix)
            else:
                return send_from_directory(self.directory, 'index.html')
        

        # # Set up routes
        # @self.app.route(f'{self.directory}/<path:filename>')
        # def serve_file(filename):
        #     print("serve_file", self.directory / filename)
        #     return send_from_directory(self.directory, filename)

        # @self.app.route(f'{self.url_path}/')
        # @self.app.route(f'{self.url_path}')
        # def redirect_to_slash():
        #     # return send_from_directory(self.directory, 'index.html')                                                                 
        #     return redirect(str(Path(request.path, 'dist', 'index.html')), code=301)           

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


def generate_test_config(test_dir, action, port=3000, config_path='config.yaml'):
    """
    Generate test-specific config.yaml file by loading an existing config and updating it.

    Args:
        test_dir: Path to the test dist directory
        test_name: Name of the test (for config file naming)
        action: Action to test (crawl, detection, graph_gen, analysis)
        port: Port number for test server
        url_path: URL path for the test (e.g., /tests/pipeline_test/sites/...)
        config_path: Path to base config.yaml to load

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


def version_matches(expected_version, actual_version):
    """
    Check if expected version matches actual detected version(s).

    Args:
        expected_version: Ground truth version string (e.g., '3.4.0')
        actual_version: Detected version - can be:
            - String: 'unknown' or '3.4.0'
            - List: ['1.1', '1.3 ~ 1.5', '2.0']

    Returns:
        True if versions match, False otherwise
    """
    # If either is unknown, it's a match
    if expected_version == 'unknown' or actual_version == 'unknown':
        return True

    # Normalize actual_version to list
    if isinstance(actual_version, str):
        actual_versions = [actual_version]
    else:
        actual_versions = actual_version

    # Check each possible version pattern
    for version_pattern in actual_versions:
        try:
            st_end = list(map(str.strip, version_pattern.split('~')))
        except Exception:
            # If split fails, treat as exact version
            if version_pattern == expected_version:
                return True
            continue

        if len(st_end) == 1:
            # Exact version match
            if st_end[0] == expected_version:
                return True
        elif len(st_end) == 2:
            # Version range: check if expected version is within range
            st, end = st_end[0], st_end[1]
            # Simple string comparison - works for semver if properly formatted
            # For more robust comparison, would need semver parsing
            if st <= expected_version <= end or expected_version == st or expected_version == end:
                return True

    return False


def test_detection(expected, actual_data_dir):
    """
    Test library detection phase results.

    Args:
        expected: Expected results from ans.json['detection']
            Expected format: {
                "PTV": {
                    "detection": [
                        {"libname": "jquery", "version": "3.4.0"},
                        {"libname": "lodash", "version": "unknown"}
                    ]
                },
                "PTV-Original": {
                    "detection": [
                        {"libname": "jquery", "version": "3.4.0"}
                    ]
                }
            }
        actual_data_dir: Path to pipeline output data directory

    Returns:
        (success: bool, message: str)
    """
    if not actual_data_dir or not actual_data_dir.exists():
        return False, "Data directory not found"

    # Find lib.detection.json file
    lib_detection_files = list(actual_data_dir.rglob('lib.detection.json'))
    if not lib_detection_files:
        return False, "lib.detection.json not found in data directory"

    lib_detection_file = lib_detection_files[0]

    try:
        with open(lib_detection_file, 'r') as f:
            detection_data = json.load(f)
    except json.JSONDecodeError as e:
        return False, f"Failed to parse lib.detection.json: {e}"

    # Extract actual detected libraries from PTV and PTV-Original
    actual_ptv_libs = {}
    actual_ptv_original_libs = {}

    for url_data in detection_data.values():
        # Check PTV detection
        if 'PTV' in url_data and 'detection' in url_data['PTV']:
            for detection_array in url_data['PTV']['detection']:
                for lib in detection_array:
                    libname = lib.get('libname')
                    actual_ptv_libs[libname] = {
                        'version': lib.get('version', 'unknown'),
                        'accurate': lib.get('accurate', False)
                    }

        # Check PTV-Original detection
        if 'PTV-Original' in url_data and 'detection' in url_data['PTV-Original']:
            for detection_array in url_data['PTV-Original']['detection']:
                for lib in detection_array:
                    libname = lib.get('libname')
                    actual_ptv_original_libs[libname] = {
                        'version': lib.get('version', 'unknown'),
                        'accurate': lib.get('accurate', False)
                    }

    # Compare against expected libraries
    results = []
    total_expected = 0
    perfect_matches = 0
    warnings = 0
    failures = 0

    # Check PTV expectations
    if 'PTV' in expected and 'detection' in expected['PTV']:
        expected_ptv_libs = expected['PTV']['detection']
        total_expected += len(expected_ptv_libs)

        for expected_lib in expected_ptv_libs:
            libname = expected_lib.get('libname')
            expected_version = expected_lib.get('version', 'unknown')

            if libname not in actual_ptv_libs:
                results.append(f"❌ PTV: '{libname}' not found")
                failures += 1
            else:
                actual_lib = actual_ptv_libs[libname]
                actual_version = actual_lib['version']

                # Check version match using version_matches function
                version_match = version_matches(expected_version, actual_version)

                if version_match and actual_lib['accurate']:
                    results.append(f"✅ PTV: '{libname}' v{actual_version}")
                    perfect_matches += 1
                elif version_match and not actual_lib['accurate']:
                    results.append(f"⚠️  PTV: '{libname}' v{actual_version} (not accurate)")
                    warnings += 1
                else:
                    results.append(f"❌ PTV: '{libname}' version mismatch (expected {expected_version}, got {actual_version})")
                    failures += 1

    # Check PTV-Original expectations
    if 'PTV-Original' in expected and 'detection' in expected['PTV-Original']:
        expected_ptv_original_libs = expected['PTV-Original']['detection']
        total_expected += len(expected_ptv_original_libs)

        for expected_lib in expected_ptv_original_libs:
            libname = expected_lib.get('libname')
            expected_version = expected_lib.get('version', 'unknown')

            if libname not in actual_ptv_original_libs:
                results.append(f"❌ PTV-Original: '{libname}' not found")
                failures += 1
            else:
                actual_lib = actual_ptv_original_libs[libname]
                actual_version = actual_lib['version']

                # Check version match using version_matches function
                version_match = version_matches(expected_version, actual_version)

                if version_match and actual_lib['accurate']:
                    results.append(f"✅ PTV-Original: '{libname}' v{actual_version}")
                    perfect_matches += 1
                elif version_match and not actual_lib['accurate']:
                    results.append(f"⚠️  PTV-Original: '{libname}' v{actual_version} (not accurate)")
                    warnings += 1
                else:
                    results.append(f"❌ PTV-Original: '{libname}' version mismatch (expected {expected_version}, got {actual_version})")
                    failures += 1

    if total_expected == 0:
        return True, "No expected libraries to verify"

    # Build summary message
    summary = f"{perfect_matches}✅ {warnings}⚠️  {failures}❌ / {total_expected} total"
    full_message = summary + "\n    " + "\n    ".join(results)

    # Test passes if there are no failures (warnings are acceptable)
    return failures == 0, full_message


def test_vuln_db(expected, actual_data_dir):
    """
    Test vulnerability database query phase results.

    Args:
        expected: Expected results from ans.json['vuln_db']
        actual_data_dir: Path to pipeline output data directory

    Returns:
        (success: bool, message: str)
    """
    # TODO: Implement vuln_db comparison logic
    # This should compare vulnerability findings from the database
    # with expected vulnerabilities in ans.json
    return True, "Vuln DB test not implemented yet"


def test_graph_gen(expected, actual_data_dir):
    """
    Test graph generation (static analysis) phase results.

    Args:
        expected: Expected results from ans.json['graph_gen']
        actual_data_dir: Path to pipeline output data directory

    Returns:
        (success: bool, message: str)
    """
    # TODO: Implement graph generation comparison logic
    # This should compare generated graphs/CFG
    # with expected graph properties in ans.json
    return True, "Graph generation test not implemented yet"


def test_analysis(expected, actual_data_dir):
    """
    Test static analysis (Neo4j) phase results.

    Args:
        expected: Expected results from ans.json['analysis']
        actual_data_dir: Path to pipeline output data directory

    Returns:
        (success: bool, message: str)
    """
    # TODO: Implement analysis comparison logic
    # This should compare final analysis results from Neo4j
    # with expected analysis results in ans.json
    return True, "Analysis test not implemented yet"


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

    if 'lib_detection' in phases_to_test and 'vuln_db' in expected_answers:
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

    if not (test_dir := get_test_dir(test_path)):
        return False

    dist_dir = test_dir
    if not dist_dir.exists():
        print(f"Error: dist/ directory not found in {test_dir}")
        print(f"  Run test_prep.py first to build distribution files")
        return False

    print(f"\nRunning test: {test_path}")
    print(f"  Testing action: {action}")
    print(f"  Phases to run: {ACTIONS.get(action, [])}")

    # Generate test config
    config_path = generate_test_config(test_dir, action, port, base_config)

    # Start test server and run pipeline
    with test_server(dist_dir, port):
        pipeline_success = run_pipeline(config_path, timeout=600)

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
    parser.add_argument(
        '--server-only',
        type=str,
        default=False,
        help='Only hosts the server corresponds to this test'
    )


    args = parser.parse_args()
    if args.server_only:
        host_server(args.test, args.port)
    else:
        success = run_test(args.test, args.action, args.port, args.config)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
