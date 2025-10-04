#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test Preparation Script
-----------------------
Builds distribution files for pipeline tests by running `npm run build`.

Usage:
    python test_prep.py [--test=<path>]

    If --test is provided, only prepares that specific test.
    Otherwise, prepares all tests found under sites/
"""

import sys
import subprocess
import argparse
from pathlib import Path

# Add parent directory to path for imports
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(BASE_DIR))


def find_test_dirs(base_path='sites'):
    """
    Find all test directories with names starting with test_*.

    Args:
        base_path: Base directory to search for tests

    Returns:
        List of Path objects pointing to test directories
    """
    test_dirs = []
    base = Path(__file__).parent / base_path

    if not base.exists():
        print(f"Warning: Base path {base} does not exist")
        return test_dirs

    # Find all directories under base with names starting with test_*
    for dir in base.rglob('*'):
        if dir.is_dir() and dir.name.startswith('test_'):
            test_dirs.append(dir)

    return test_dirs


def prepare_test(test_dir):
    """
    Prepare a single test by running `npm run build` if package.json exists.

    Args:
        test_dir: Path to test directory

    Returns:
        True if successful or skipped, False on error
    """
    test_path = Path(test_dir)

    if not test_path.exists():
        print(f"Error: Test directory {test_path} does not exist")
        return False

    package_json = test_path / 'package.json'

    if not package_json.exists():
        print(f"Skipping {test_path.name}: no package.json file found")
        return True

    print(f"Building test: {test_path}")

    try:
        # Run npm install
        print(f"  Running npm install...")
        try:
            subprocess.run(
                ['npm', 'install'],
                cwd=test_path,
                check=True,
                capture_output=True,
                text=True
            )
        except Exception as e:
            print(f"  npm install failed: {e}")

        # Run npm run build
        print(f"  Running npm run build...")
        subprocess.run(
            ['npm', 'run', 'build'],
            cwd=test_path,
            check=True,
            capture_output=True,
            text=True
        )

        print(f"  Build completed successfully")
        return True

    except subprocess.CalledProcessError as e:
        print(f"  Error building test: {e}")
        if e.stdout:
            print(f"  stdout: {e.stdout}")
        if e.stderr:
            print(f"  stderr: {e.stderr}")
        return False
    except FileNotFoundError:
        print(f"  Error: npm not found. Please install Node.js and npm")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Prepare test files by running npm run build'
    )
    parser.add_argument(
        '--test',
        type=str,
        help='Specific test directory to prepare (relative to sites/)',
        default=None
    )

    args = parser.parse_args()

    if args.test:
        # Prepare specific test
        test_path = Path(__file__).parent / 'sites' / args.test
        success = prepare_test(test_path)
        sys.exit(0 if success else 1)
    else:
        # Prepare all tests
        test_dirs = find_test_dirs()

        if not test_dirs:
            print("No tests found (searched for directories starting with test_)")
            sys.exit(1)

        print(f"Found {len(test_dirs)} test(s)\n")

        success_count = 0
        failed_tests = []
        for test_dir in test_dirs:
            if prepare_test(test_dir):
                success_count += 1
            else:
                failed_tests.append(str(test_dir.name))
            print()  # Empty line between tests

        if len(failed_tests):
            print(f"❌ Failed preparation at [{', '.join(failed_tests)}]")
        else:
            print(f"✅ Prepared {success_count}/{len(test_dirs)} test(s)")
        sys.exit(0 if success_count == len(test_dirs) else 1)


if __name__ == '__main__':
    main()
