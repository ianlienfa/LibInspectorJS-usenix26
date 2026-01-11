#!/usr/bin/env python3
"""
Parse all sink.flows.out files recursively and generate trace.json
in each directory containing a sink.flows.out file.
"""

import os
import re
import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple


def parse_location(location_str: str) -> Tuple[int, int, int, int]:
    """
    Parse location string like '{start:{line:1204,column:8},end:{line:1206,column:10}}'
    Returns (start_line, start_column, end_line, end_column)
    """
    pattern = r'\{start:\{line:(\d+),column:(\d+)\},end:\{line:(\d+),column:(\d+)\}\}'
    match = re.search(pattern, location_str)
    if match:
        return (
            int(match.group(1)),
            int(match.group(2)),
            int(match.group(3)),
            int(match.group(4))
        )
    return None


def parse_match_set(match_set_str: str) -> Set[str]:
    """
    Parse match_set string like "['13']" or "['$', 'location']"
    Returns a set of strings
    """
    # Remove leading/trailing brackets and quotes
    match_set_str = match_set_str.strip()
    if match_set_str.startswith('[') and match_set_str.endswith(']'):
        match_set_str = match_set_str[1:-1]

    # Parse the items
    items = []
    # Handle quoted strings
    pattern = r"'([^']*)'"
    items = re.findall(pattern, match_set_str)

    return set(items) if items else set()


def parse_sink_flows_out(file_path: str) -> Dict[Tuple[int, int, int, int, str], Set[str]]:
    """
    Parse a sink.flows.out file and extract location-to-match_set mappings.

    Returns a dict mapping (start_line, start_col, end_line, end_col, filename)
    to a set of match_set values.
    """
    mappings = {}

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find all "[*] POC Maximum Matched Levels:" sections
    sections = content.split('[*] POC Maximum Matched Levels:')

    for section in sections[1:]:  # Skip first empty section
        # Split into individual node entries
        entries = re.split(r'\n-- node:', section)

        for entry in entries:
            if not entry.strip():
                continue

            # Extract match_set
            match_set_match = re.search(r'\|- match_set: (.+)', entry)
            # Extract file path
            file_match = re.search(r'\|- file: (.+)', entry)
            # Extract location
            location_match = re.search(r'\|- location: (.+)', entry)

            if match_set_match and file_match and location_match:
                match_set_str = match_set_match.group(1).strip()
                file_path_str = file_match.group(1).strip()
                location_str = location_match.group(1).strip()

                # Parse location
                location = parse_location(location_str)
                if not location:
                    continue

                # Parse match_set
                match_set = parse_match_set(match_set_str)
                if not match_set:
                    continue

                # Create key: (start_line, start_col, end_line, end_col, filename)
                key = (*location, file_path_str)

                # Merge match_sets if key already exists
                if key in mappings:
                    mappings[key].update(match_set)
                else:
                    mappings[key] = match_set

    return mappings


def find_all_sink_flows(root_dir: str) -> List[str]:
    """
    Recursively find all sink.flows.out files in the directory.
    """
    sink_flows_files = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file == 'sink.flows.out':
                sink_flows_files.append(os.path.join(root, file))
    return sink_flows_files


def generate_trace_json(mappings: Dict[Tuple[int, int, int, int, str], Set[str]]) -> Dict[str, List[Dict]]:
    """
    Convert the mappings to trace.json format.

    Format:
    {
      "filename": [
        {
          "startLine": 1204,
          "startChar": 8,
          "endLine": 1206,
          "endChar": 10,
          "message": "{'$'}",
          "severity": "info"
        }
      ]
    }
    """
    trace_data = defaultdict(list)

    for (start_line, start_col, end_line, end_col, filename), match_set in mappings.items():
        # Convert set to string representation
        match_set_str = str(match_set)

        entry = {
            "startLine": start_line,
            "startChar": start_col,
            "endLine": end_line,
            "endChar": end_col,
            "message": match_set_str,
            "severity": "info"
        }

        trace_data[filename].append(entry)

    # Sort entries by location for each file
    for filename in trace_data:
        trace_data[filename].sort(key=lambda x: (x["startLine"], x["startChar"]))

    return dict(trace_data)


def process_sink_flows_file(sink_flows_path: str) -> None:
    """
    Process a single sink.flows.out file and generate trace.json in the same directory.
    """
    directory = os.path.dirname(sink_flows_path)
    trace_output = os.path.join(directory, 'trace.json')

    print(f"Processing: {sink_flows_path}")

    try:
        # Parse the sink.flows.out file
        mappings = parse_sink_flows_out(sink_flows_path)

        if not mappings:
            print(f"  No mappings found, skipping trace.json generation")
            return

        # Generate trace.json
        trace_data = generate_trace_json(mappings)

        # Write to trace.json in the same directory
        with open(trace_output, 'w', encoding='utf-8') as f:
            json.dump(trace_data, f, indent=2)

        print(f"  ✓ Generated {trace_output}")
        print(f"    - {len(trace_data)} unique files")
        print(f"    - {sum(len(v) for v in trace_data.values())} total entries")

    except Exception as e:
        print(f"  ✗ Error: {e}")


def main():
    parser = argparse.ArgumentParser(
        description='Parse sink.flows.out files and generate trace.json in each directory'
    )
    parser.add_argument(
        'input_dir',
        help='Root directory to search for sink.flows.out files'
    )

    args = parser.parse_args()

    # Find all sink.flows.out files
    print(f"Searching for sink.flows.out files in {args.input_dir}...")
    sink_flows_files = find_all_sink_flows(args.input_dir)
    print(f"Found {len(sink_flows_files)} sink.flows.out files\n")

    # Process each file
    for i, file_path in enumerate(sink_flows_files, 1):
        print(f"[{i}/{len(sink_flows_files)}]")
        process_sink_flows_file(file_path)
        print()

    print("Done!")


if __name__ == '__main__':
    main()
