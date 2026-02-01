#!/usr/bin/env python3
"""
Notebook Execution Tool
=======================
Executes all Jupyter notebooks in the repository and logs execution results.

Usage:
    python tools/run_all_notebooks.py [--lab LAB_NUMBER]

Options:
    --lab LAB_NUMBER    Only run notebooks for a specific lab (1-5)
    --timeout SECONDS   Timeout for each cell execution (default: 300)
    --continue-on-error Continue execution even if a notebook fails
"""

import sys
import os
import argparse
import json
from pathlib import Path
from datetime import datetime

# Add project root to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))


def find_all_notebooks(root_dir: Path, lab_filter: int = None) -> list:
    """Find all .ipynb files in the repository."""
    notebooks = []
    solutions_dir = root_dir / "Solutions"
    
    if not solutions_dir.exists():
        print(f"[WARNING] Solutions directory not found: {solutions_dir}")
        return notebooks
    
    for lab_dir in sorted(solutions_dir.iterdir()):
        if not lab_dir.is_dir():
            continue
        
        # Extract lab number
        lab_name = lab_dir.name
        try:
            lab_num = int(lab_name.split()[1]) if "Lab" in lab_name else None
        except (IndexError, ValueError):
            lab_num = None
        
        # Apply filter
        if lab_filter is not None and lab_num != lab_filter:
            continue
        
        # Find all notebooks recursively
        for nb_path in lab_dir.rglob("*.ipynb"):
            # Skip checkpoints
            if ".ipynb_checkpoints" in str(nb_path):
                continue
            notebooks.append({
                "path": nb_path,
                "lab": lab_name,
                "name": nb_path.name
            })
    
    return notebooks


def execute_notebook(notebook_path: Path, timeout: int = 300) -> dict:
    """Execute a notebook and return execution result."""
    result = {
        "notebook": str(notebook_path),
        "status": "unknown",
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "duration_seconds": None,
        "error": None,
        "cells_executed": 0,
        "cells_total": 0
    }
    
    try:
        import nbformat
        from nbclient import NotebookClient
        from nbclient.exceptions import CellExecutionError, DeadKernelError
    except ImportError as e:
        result["status"] = "skipped"
        result["error"] = f"Missing dependency: {e}. Install with: pip install nbclient nbformat"
        return result
    
    start = datetime.now()
    
    try:
        # Load notebook
        with open(notebook_path, "r", encoding="utf-8") as f:
            nb = nbformat.read(f, as_version=4)
        
        result["cells_total"] = len([c for c in nb.cells if c.cell_type == "code"])
        
        # Create client with kernel
        client = NotebookClient(
            nb,
            timeout=timeout,
            kernel_name="python3",
            resources={"metadata": {"path": str(notebook_path.parent)}}
        )
        
        # Execute
        client.execute()
        
        result["status"] = "success"
        result["cells_executed"] = result["cells_total"]
        
    except (CellExecutionError, DeadKernelError) as e:
        result["status"] = "failed"
        result["error"] = str(e)[:500]
        
    except Exception as e:
        result["status"] = "error"
        result["error"] = f"{type(e).__name__}: {str(e)[:300]}"
    
    end = datetime.now()
    result["end_time"] = end.isoformat()
    result["duration_seconds"] = (end - start).total_seconds()
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Execute all notebooks in the repository")
    parser.add_argument("--lab", type=int, help="Only run notebooks for a specific lab (1-5)")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout for each cell (default: 300s)")
    parser.add_argument("--continue-on-error", action="store_true", help="Continue even if a notebook fails")
    args = parser.parse_args()
    
    # Setup logging
    log_dir = PROJECT_ROOT / "outputs" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"notebook_execution_{timestamp}.json"
    
    print("=" * 70)
    print("NOTEBOOK EXECUTION TOOL")
    print("=" * 70)
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Log file: {log_file}")
    if args.lab:
        print(f"Lab filter: Lab {args.lab}")
    print()
    
    # Find notebooks
    notebooks = find_all_notebooks(PROJECT_ROOT, args.lab)
    
    if not notebooks:
        print("[WARNING] No notebooks found to execute")
        return 1
    
    print(f"Found {len(notebooks)} notebooks to execute:")
    for nb in notebooks:
        print(f"  - [{nb['lab']}] {nb['name']}")
    print()
    
    # Execute notebooks
    results = []
    success_count = 0
    failed_count = 0
    skipped_count = 0
    
    for i, nb_info in enumerate(notebooks, 1):
        nb_path = nb_info["path"]
        print(f"[{i}/{len(notebooks)}] Executing: {nb_info['name']}")
        print(f"            Lab: {nb_info['lab']}")
        
        result = execute_notebook(nb_path, timeout=args.timeout)
        results.append(result)
        
        status = result["status"]
        duration = result.get("duration_seconds", 0)
        
        if status == "success":
            print(f"            [OK] Completed in {duration:.1f}s")
            success_count += 1
        elif status == "skipped":
            print(f"            [SKIP] {result.get('error', 'Unknown reason')}")
            skipped_count += 1
        else:
            print(f"            [FAIL] {result.get('error', 'Unknown error')[:100]}")
            failed_count += 1
            if not args.continue_on_error:
                print("\n[ABORTED] Stopping due to failure (use --continue-on-error to continue)")
                break
        
        print()
    
    # Write log
    log_data = {
        "timestamp": timestamp,
        "summary": {
            "total": len(notebooks),
            "executed": len(results),
            "success": success_count,
            "failed": failed_count,
            "skipped": skipped_count
        },
        "results": results
    }
    
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("=" * 70)
    print("EXECUTION SUMMARY")
    print("=" * 70)
    print(f"  Total notebooks:  {len(notebooks)}")
    print(f"  Executed:         {len(results)}")
    print(f"  Success:          {success_count}")
    print(f"  Failed:           {failed_count}")
    print(f"  Skipped:          {skipped_count}")
    print(f"\nLog saved to: {log_file}")
    
    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
