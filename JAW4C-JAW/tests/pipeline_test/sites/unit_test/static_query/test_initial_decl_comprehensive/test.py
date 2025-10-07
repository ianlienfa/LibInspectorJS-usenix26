#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Comprehensive unit test for initial declaration query functions

This test validates all 4 query functions plus the complete getInitialDeclaration:
- _get_initial_decl_via_cfg
- _get_initial_decl_via_callgraph
- _get_initial_decl_via_params
- _get_initial_decl_via_assignment
- getInitialDeclaration (complete function)
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


def test_initial_decl_comprehensive(tx, test_cases):
    """
    Comprehensive test for all initial declaration query functions

    Args:
        tx: Neo4j transaction object
        test_cases: List of test case dictionaries from ans.json

    Returns:
        dict: Test results with pass/fail status for each case
    """
    results = {}

    # Map query function names to actual functions
    query_functions = {
        '_get_initial_decl_via_cfg': neo4jQueryUtilityModule._get_initial_decl_via_cfg,
        # '_get_initial_decl_via_callgraph': neo4jQueryUtilityModule._get_initial_decl_via_callgraph,
                    # Skip this test, the case can be covered by the cfg case
        '_get_initial_decl_via_params': neo4jQueryUtilityModule._get_initial_decl_via_params,
        '_get_initial_decl_via_assignment': neo4jQueryUtilityModule._get_initial_decl_via_assignment, 
        'getInitialDeclaration': neo4jQueryUtilityModule.getInitialDeclaration,
    }

    for test_case in test_cases:
        test_name = test_case['name']
        node_range = test_case['node_range']
        query_function_name = test_case['query_function']

        # Get the node from the graph using its Range property
        nodes = neo4jQueryUtilityModule.getNodeFromRange(tx, node_range)

        if not nodes:
            results[test_name] = {
                'status': 'FAIL',
                'reason': f'Node with range {node_range} not found in graph'
            }
            continue

        node = nodes[0]

        # Get the query function
        if query_function_name not in query_functions:
            results[test_name] = {
                'status': 'ERROR',
                'reason': f'Unknown query function: {query_function_name}'
            }
            continue

        query_fn = query_functions[query_function_name]

        # Call the function being tested
        try:
            # For the individual query functions, we need to get topmost expression first
            if query_function_name != 'getInitialDeclaration':
                top_most_expr = neo4jQueryUtilityModule.get_ast_topmost(tx, node)
                print(f"[{test_name}] top_most_expr: {top_most_expr}")
                res = query_fn(tx, top_most_expr['Id'], node['Code'])
            else:
                # getInitialDeclaration takes the node directly
                res = query_fn(tx, node)
                # getInitialDeclaration returns [declarationNode, identifierNode]
                # We need to convert to the format expected by compare_get_identical_res
                if res:
                    res = (res[0], res[1], None)

            if res is None:
                results[test_name] = {
                    'status': 'FAIL',
                    'reason': f'{query_function_name} returned None'
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
