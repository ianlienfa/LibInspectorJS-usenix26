#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Shared utility functions for unit tests

This module provides common helper functions used across unit test files.
"""

import sys
from pathlib import Path
from ast import literal_eval

# Add project root to path
TEST_DIR = Path(__file__).resolve().parent
BASE_DIR = TEST_DIR.parent.parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import hpg_neo4j.query_utility as neo4jQueryUtilityModule


def strong_overlap(rangeGiven, rangeExpected, pass_ratio=0.8):
    """
    Calculates the length of overlap between two numerical ranges.
    Ranges are expected as tuples (min, max).

    Args:
        rangeGiven: Tuple (start, end) of the actual range
        rangeExpected: Tuple (start, end) of the expected range
        pass_ratio: Minimum overlap ratio required (default: 0.8)

    Returns:
        bool: True if overlap ratio exceeds pass_ratio, False otherwise
    """
    start1, end1 = rangeExpected
    start2, end2 = rangeGiven

    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)

    if overlap_start < overlap_end:
        return True if ((overlap_end - overlap_start) / float(end1 - start1)) > pass_ratio else False
    return False


def compare_get_identical_res(tx, res, testcase) -> tuple[bool, list[str]]:
    """
    Compare the result from getInitialDeclaration with expected values.

    Args:
        tx: Neo4j transaction object
        res: Result tuple (declaration_node, identifier_node, ...)
        testcase: Test case dictionary with 'expected' and 'verify' fields

    Returns:
        tuple: (passed: bool, reasons: list[str])
            - passed: True if all checks pass, False otherwise
            - reasons: List of failure reasons (empty if passed)
    """
    expected, verify = testcase['expected'], testcase['verify']
    declaration_node, identifier_node, _ = res

    # Verify results match expected values
    actual_decl_type = declaration_node['Type']
    actual_decl_range = literal_eval(declaration_node['Range'])
    actual_id_type = identifier_node['Type']
    actual_id_code = identifier_node['Code']
    actual_id_range = literal_eval(identifier_node['Range'])
    exp_decl_type = expected['declaration_node_type']
    exp_id_type = expected['identifier_node_type']
    exp_decl_range = literal_eval(expected['declaration_node_range'])
    exp_id_range = literal_eval(expected['identifier_node_range'])


    # Compare with expected
    passed = True
    reasons = []

    if actual_decl_type != exp_decl_type:
        passed = False
        reasons.append(f"Declaration type mismatch: expected '{exp_decl_type}', got '{actual_decl_type}'")

    if actual_id_type != exp_id_type:
        passed = False
        reasons.append(f"Identifier type mismatch: expected '{exp_id_type}', got '{actual_id_type}'")

    if not strong_overlap(actual_decl_range, exp_decl_range):
        passed = False
        actual_decl_code = neo4jQueryUtilityModule.getCodeOf(tx, declaration_node)
        exp_decl_code = verify['declaration_code']
        reasons.append(f"Declaration range mismatch: expected '{exp_decl_code}', got '{actual_decl_code}'")

    if not strong_overlap(actual_id_range, exp_id_range):
        passed = False
        reasons.append(f"Identifier range mismatch: expected '{exp_id_range}', got '{actual_id_range}', {actual_id_code}")

    return (passed, reasons)
