#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test Phase Validation Functions
--------------------------------
Contains validation functions for each pipeline phase:
- test_detection: Validates library detection results
- test_vuln_db: Validates vulnerability database queries
- test_graph_gen: Validates graph generation/static analysis
- test_analysis: Validates Neo4j static analysis results
"""

import json


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
            Expected format: {

            }
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
