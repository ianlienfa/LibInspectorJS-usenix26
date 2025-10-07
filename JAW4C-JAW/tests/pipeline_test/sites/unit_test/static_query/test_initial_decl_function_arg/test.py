#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Unit test for getInitialDeclaration query function

This test validates the getInitialDeclaration function from query_utility.py
by testing it against nodes in the HPG graph.
"""

import sys
import traceback
from pathlib import Path

# Add project root to path
TEST_DIR = Path(__file__).resolve().parent
BASE_DIR = TEST_DIR.parent.parent.parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

# Add unit_test directory to path for test_utils
UNIT_TEST_DIR = TEST_DIR.parent.parent
sys.path.insert(0, str(UNIT_TEST_DIR))

import hpg_neo4j.query_utility as neo4jQueryUtilityModule
from test_utils import compare_get_identical_res


def test_get_initial_declaration(tx, test_cases):
    """
    Test the getInitialDeclaration function

    Args:
        tx: Neo4j transaction object
        test_cases: List of test case dictionaries from ans.json

    Returns:
        dict: Test results with pass/fail status for each case
    """
    results = {}

    for test_case in test_cases:
        test_name = test_case['name']
        node_range = test_case['node_range']

        # Get the node from the graph using its Range property
        nodes = neo4jQueryUtilityModule.getNodeFromRange(tx, node_range)

        if not nodes:
            results[test_name] = {
                'status': 'FAIL',
                'reason': f'Node with range {node_range} not found in graph'
            }
            continue

        node = nodes[0]

        # Call the function being tested
        try:
            top_most_expr = neo4jQueryUtilityModule.get_ast_topmost(tx, node)
            print(f"top_most_expr", top_most_expr)
            res = neo4jQueryUtilityModule._get_initial_decl_via_params(tx, top_most_expr['Id'], node['Code'])

            if res is None:
                results[test_name] = {
                    'status': 'FAIL',
                    'reason': 'getInitialDeclaration returned None'
                }
                continue

            # Use helper function for comparison
            passed, reasons = compare_get_identical_res(tx, res, test_case)

            if passed:
                results[test_name] = {
                    'status': 'PASS',
                }
            else:
                results[test_name] = {
                    'status': 'FAIL',
                    'reason': '; '.join(reasons),
                }

        except Exception as e:
            results[test_name] = {
                'status': 'ERROR',
                'reason': str(e),
                'stack_trace': traceback.format_exc()
            }

    return results
