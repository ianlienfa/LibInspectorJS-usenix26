#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Unit Test Builder for Static Analysis Graph Querying

This script generates HPG (Hybrid Program Graph) files from simple JavaScript test cases
and optionally runs queries against them via Neo4j.

Usage:
------
# Build graph for a single test
python unit_test_builder.py --test=test_initial_decl_cfg

# Build graphs for all tests
python unit_test_builder.py --all

# Build and query (requires neo4j)
python unit_test_builder.py --test=test_initial_decl_cfg --query

# Clean generated files
python unit_test_builder.py --test=test_initial_decl_cfg --clean
"""

import os
import sys
import json
import argparse
import subprocess
import time
import uuid
from pathlib import Path
import re

# Add parent directories to path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
# Go up: unit_test -> sites -> pipeline_test -> tests -> JAW4C-JAW
BASE_DIR = SCRIPT_DIR.parent.parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import constants as constantsModule
import utils.io as IOModule
import docker.neo4j.manage_container as dockerModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
from utils.logging import logger

# Paths
STATIC_QUERY_DIR = SCRIPT_DIR / "static_query"
CVE_VULN_DIR = BASE_DIR / "analyses" / "cve_vuln"
STATIC_ANALYSIS_JS = CVE_VULN_DIR / "static_analysis.js"


def create_test_structure(test_name):
    """
    Create directory structure for a new test case

    Args:
        test_name: Name of the test (e.g., 'test_initial_decl_cfg')

    Note: Test JavaScript files must be named 0.js, 1.js, etc. to match
    the format expected by static_analysis.js (same as crawler output)
    """
    test_dir = STATIC_QUERY_DIR / test_name
    test_dir.mkdir(parents=True, exist_ok=True)

    # Create 0.js if it doesn't exist (static_analysis.js expects numbered files)
    js_file = test_dir / "0.js"
    if not js_file.exists():
        js_file.write_text("// TODO: Add test JavaScript code here\n")
        logger.info(f"Created {js_file}")

    # Create url.out (required by static_analysis.js)
    url_file = test_dir / "url.out"
    if not url_file.exists():
        url_file.write_text(f"http://localhost/unit_test/{test_name}\n")
        logger.info(f"Created {url_file}")

    # Create ans.json if it doesn't exist
    ans_json = test_dir / "ans.json"
    if not ans_json.exists():
        ans_json.write_text(json.dumps({
            "queries": {
                "example_query": {
                    "description": "Example query description",
                    "expected_result": "describe expected output"
                }
            }
        }, indent=2))
        logger.info(f"Created {ans_json}")

    logger.info(f"Test structure created at {test_dir}")
    return test_dir


def build_graph(test_dir, memory="8192", timeout=180):
    """
    Generate nodes.csv.gz and edges.csv.gz for a test directory

    Args:
        test_dir: Path to test directory containing 0.js (or numbered .js files)
        memory: Memory allocation for node process (MB)
        timeout: Timeout in seconds

    Returns:
        bool: True if successful
    """
    test_dir = Path(test_dir)

    # Check for at least one .js file (0.js, 1.js, etc.)
    js_files = list(test_dir.glob("*.js"))
    if not js_files:
        logger.error(f"No .js files found in {test_dir}")
        logger.error(f"Test files must be named 0.js, 1.js, etc. (same as crawler output)")
        return False

    # Ensure url.out exists (required by static_analysis.js)
    url_file = test_dir / "url.out"
    if not url_file.exists():
        test_name = test_dir.name
        url_file.write_text(f"http://localhost/unit_test/{test_name}\n")
        logger.info(f"Created missing url.out file")

    # Prepare static analysis command
    cmd = [
        "node",
        f"--max-old-space-size={memory}",
        str(STATIC_ANALYSIS_JS),
        f"--singlefolder={test_dir}",
        "--compresshpg=true",
        "--overwritehpg=true",
        "--iterativeoutput=false"
    ]

    logger.info(f"Running static analysis on {test_dir}")
    logger.info(f"Command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            cwd=str(CVE_VULN_DIR),
            timeout=timeout,
            capture_output=True,
            text=True
        )

        # Log output regardless of return code for debugging
        if result.stdout:
            logger.info(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            logger.warning(f"STDERR:\n{result.stderr}")

        if result.returncode != 0:
            logger.error(f"Static analysis failed with return code {result.returncode}")
            return False

        # Check if graph files were generated
        nodes_file = test_dir / f"{constantsModule.NODE_INPUT_FILE_NAME}.gz"
        edges_file = test_dir / f"{constantsModule.RELS_INPUT_FILE_NAME}.gz"

        if nodes_file.exists() and edges_file.exists():
            logger.info(f"Successfully generated graph files:")
            logger.info(f"  - {nodes_file}")
            logger.info(f"  - {edges_file}")
            return True
        else:
            logger.error(f"Graph files not found after static analysis")
            return False

    except subprocess.TimeoutExpired:
        logger.error(f"Static analysis timed out after {timeout} seconds")
        return False
    except Exception as e:
        logger.error(f"Error running static analysis: {e}")
        return False


def neo4j_wait(try_attempt=2):
    """
    Wait for Neo4j bolt connection to be ready

    Args:
        try_attempt: Number of connection attempts (default: 2)
    """
    for _ in range(try_attempt):
        logger.info('Waiting for the tcp port 7474 of the neo4j container to be ready...')
        connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
        if connection_success:
            break
        else:
            logger.info('Waiting failed, retrying ...')
            time.sleep(5)


def load_graph_to_neo4j(test_dir):
    """
    Load graph into a Neo4j container for querying

    Follows the same pattern as build_hpg in cve_vuln_neo4j_traversals.py:
    1. Create container and import data
    2. Stop container (keep volume)
    3. Remove container
    4. Recreate container on same volume (avoids neo4j admin/user lock race)

    Args:
        test_dir: Path to test directory with graph files

    Returns:
        str: Container name if successful, None otherwise
    """
    test_dir = Path(test_dir)
    database_name = 'neo4j'
    graphid = uuid.uuid4().hex
    test_name = test_dir.name
    weburl_suffix = test_dir.parent.name  # 'static_query'
    container_name = f'neo4j_container_{graphid}_{test_name}'

    try:
        logger.info(f"Loading HPG for: {test_dir}")

        # Decompress the graph
        IOModule.decompress_graph(
            str(test_dir),
            node_file=f"{constantsModule.NODE_INPUT_FILE_NAME}.gz",
            edge_file=f"{constantsModule.RELS_INPUT_FILE_NAME}.gz"
        )

        # Check files exist
        nodes_file = test_dir / constantsModule.NODE_INPUT_FILE_NAME
        rels_file = test_dir / constantsModule.RELS_INPUT_FILE_NAME

        if not (nodes_file.exists() and rels_file.exists()):
            logger.error("nodes.csv / rels.csv files do not exist")
            return None

        # Create container
        dockerModule.create_test_neo4j_container(
            container_name,
            weburl_suffix,    # Parent directory name (e.g., 'static_query')
            test_name,        # Test directory name (e.g., 'test_initial_decl_cfg')
            str(test_dir)     # Full path to test directory
        )
        logger.info("Waiting 5 seconds for neo4j container to be ready...")
        time.sleep(5)

        # Import data
        logger.info(f"Importing data into container {container_name}")
        dockerModule.import_data_inside_container(container_name, database_name, test_name, 'CSV')

        # Wait for connection
        neo4j_wait()

        # Compress graph files back
        IOModule.compress_graph(str(test_dir))

        #### To avoid the neo4j admin <-> neo4j user racing for the same lock, recreate the whole stuff on the same volume
        dockerModule.stop_neo4j_container(container_name, cleanup=False)
        dockerModule.remove_neo4j_container(container_name)
        dockerModule.create_test_neo4j_container(
            container_name,
            weburl_suffix,
            test_name,
            str(test_dir)
        )
        ####

        # Wait for the data to be stable
        neo4j_wait()

        logger.info(f"Successfully loaded graph into container {container_name}")
        return container_name

    except Exception as e:
        logger.error(f"Error loading graph to neo4j: {e}")
        dockerModule.stop_neo4j_container(container_name)
        dockerModule.remove_neo4j_container(container_name)
        IOModule.compress_graph(str(test_dir))
        return None


def run_query_test(container_name, test_dir) -> bool:
    """
    Run a query test against the loaded graph using test.py

    Args:
        container_name: Neo4j container name
        test_dir: Test directory path

    Returns:
        True if Success else False
    """
    test_dir = Path(test_dir)
    test_py_file = test_dir / "test.py"
    ans_json_file = test_dir / "ans.json"

    # Check if test.py exists
    if not test_py_file.exists():
        logger.warning(f"No test.py found in {test_dir}, skipping query execution")
        logger.info(f"Graph is loaded and ready for manual queries in container {container_name}")
        return False

    # Check if ans.json exists
    if not ans_json_file.exists():
        logger.error(f"No ans.json found in {test_dir}")
        return False

    try:
        # Load ans.json
        import json
        with open(ans_json_file, 'r') as f:
            ans_data = json.load(f)

        # Import test.py module
        import importlib.util
        spec = importlib.util.spec_from_file_location("test_module", test_py_file)
        test_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(test_module)

        # Get test function name from ans.json
        test_function_name = ans_data.get('test_function')
        if not test_function_name:
            logger.error("ans.json must specify 'test_function' field")
            return False

        # Get test function from module
        if not hasattr(test_module, test_function_name):
            logger.error(f"Test function '{test_function_name}' not found in test.py")
            return False

        test_function = getattr(test_module, test_function_name)

        # Get test cases from ans.json
        test_cases = ans_data.get('test_cases', [])
        if not test_cases:
            logger.warning("No test_cases found in ans.json")
            return False

        # Wait for Neo4j connection
        connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=30)
        if not connection_success:
            logger.error("Failed to connect to neo4j for query")
            return False

        # Execute test function within transaction
        logger.info(f"Running test function: {test_function_name}")
        result = neo4jDatabaseUtilityModule.exec_fn_within_transaction(
            test_function,
            test_cases,
            conn_timeout=50
        )

        # Print test results
        logger.info("="*60)
        logger.info("TEST RESULTS")
        logger.info("="*60)

        passed = 0
        failed = 0
        errors = 0

        for test_name, test_result in result.items():
            status = test_result['status']
            if status == 'PASS':
                logger.info(f"✓ {test_name}: PASS")
                passed += 1
            elif status == 'FAIL':
                logger.error(f"✗ {test_name}: FAIL")
                logger.error(f"  Reason: {test_result.get('reason', 'Unknown')}")
                logger.error(f"  Trace: {test_result.get('stack_trace', 'Unknown')}")
                failed += 1
            elif status == 'ERROR':
                logger.error(f"✗ {test_name}: ERROR")
                logger.error(f"  Reason: {test_result.get('reason', 'Unknown')}")
                logger.error(f"  Trace: {test_result.get('stack_trace', 'Unknown')}")
                errors += 1

        logger.info("="*60)
        logger.info(f"Summary: {passed} passed, {failed} failed, {errors} errors")
        logger.info("="*60)

        return True if all([test_result['status'] == 'PASS' for test_name, test_result in result.items()]) else False

    except Exception as e:
        logger.error(f"Error running query test: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def cleanup_container(container_name):
    """Stop and remove Neo4j container"""
    try:
        dockerModule.stop_neo4j_container(container_name)
        dockerModule.remove_neo4j_container(container_name)
        logger.info(f"Cleaned up container {container_name}")
    except Exception as e:
        logger.error(f"Error cleaning up container: {e}")


def clean_test(test_dir):
    """Remove generated graph files from test directory"""
    test_dir = Path(test_dir)

    files_to_remove = [
        f"{constantsModule.NODE_INPUT_FILE_NAME}.gz",
        f"{constantsModule.RELS_INPUT_FILE_NAME}.gz",
        constantsModule.NODE_INPUT_FILE_NAME,
        constantsModule.RELS_INPUT_FILE_NAME
    ]

    for filename in files_to_remove:
        filepath = test_dir / filename
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Removed {filepath}")


def list_tests():
    """List all available tests"""
    if not STATIC_QUERY_DIR.exists():
        logger.info("No tests found (static_query directory doesn't exist)")
        return []

    tests = [d.name for d in STATIC_QUERY_DIR.iterdir() if d.is_dir() and d.name.startswith('test_')]
    return sorted(tests)


def main():
    parser = argparse.ArgumentParser(
        description="Unit Test Builder for Static Analysis Graph Querying"
    )

    parser.add_argument(
        '--test',
        type=str,
        help='Name of the test to build (e.g., test_initial_decl_cfg)'
    )

    parser.add_argument(
        '--all',
        action='store_true',
        help='Build all tests in static_query directory'
    )

    parser.add_argument(
        '--query',
        action='store_true',
        help='Load graph to neo4j for querying (requires --test)'
    )

    parser.add_argument(
        '--clean',
        action='store_true',
        help='Clean generated files from test directory'
    )

    parser.add_argument(
        '--create',
        type=str,
        help='Create a new test structure with given name'
    )

    parser.add_argument(
        '--list',
        action='store_true',
        help='List all available tests'
    )

    parser.add_argument(
        '--memory',
        type=str,
        default='8192',
        help='Memory allocation for node process in MB (default: 8192)'
    )

    parser.add_argument(
        '--timeout',
        type=int,
        default=180,
        help='Timeout for static analysis in seconds (default: 180)'
    )

    args = parser.parse_args()

    # List tests
    if args.list:
        tests = list_tests()
        if tests:
            logger.info(f"Available tests ({len(tests)}):")
            for test in tests:
                logger.info(f"  - {test}")
        else:
            logger.info("No tests found")
        return

    # Create new test
    if args.create:
        create_test_structure(args.create)
        return

    # Build all tests
    if args.all:
        tests = list_tests()
        if not tests:
            logger.error("No tests found")
            return

        logger.info(f"Building {len(tests)} tests...")
        success_count = 0

        for test_name in tests:
            test_dir = STATIC_QUERY_DIR / test_name
            logger.info(f"\n{'='*60}")
            logger.info(f"Building: {test_name}")
            logger.info(f"{'='*60}")

            if build_graph(test_dir, memory=args.memory, timeout=args.timeout):
                success_count += 1
            else:
                logger.error(f"Failed to build {test_name}")

        logger.info(f"\n{'='*60}")
        logger.info(f"Build complete: {success_count}/{len(tests)} successful")
        logger.info(f"{'='*60}")
        return

    # Single test operations
    if args.test:
        test_dir = STATIC_QUERY_DIR / args.test

        if not test_dir.exists():
            logger.error(f"Test directory not found: {test_dir}")
            logger.info(f"Use --create {args.test} to create it")
            return

        # Clean
        if args.clean:
            clean_test(test_dir)
            return

        # Build
        if not build_graph(test_dir, memory=args.memory, timeout=args.timeout):
            logger.error("Graph building failed")
            return

        # Query (optional)
        if args.query:
            container_name = load_graph_to_neo4j(test_dir)
            if container_name:
                logger.info(f"\nNeo4j container ready: {container_name}")

                # Run test.py if it exists
                test_results = run_query_test(container_name, test_dir)

                if test_results:
                    # Tests were run successfully, clean up container
                    logger.info(f"\nCleaning up container {container_name}")            
                    cleanup_container(container_name)
                else:
                    # No test.py or test failed, leave container running for manual inspection
                    logger.info(f"\nContainer will remain running for manual queries")
                    logger.info(f"To clean up, run: python unit_test_builder.py --test={args.test} --clean")
                    logger.info(f"\nTo stop container manually:")
                    logger.info(f"  docker stop {container_name}")
                    logger.info(f"  docker rm {container_name}")
            else:
                logger.error("Failed to load graph to neo4j")

        return

    # No arguments - show help
    parser.print_help()


if __name__ == "__main__":
    main()
