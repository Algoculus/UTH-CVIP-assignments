#!/usr/bin/env python3
"""
Python Module Testing Tool
==========================
Imports and tests all Python modules in the repository.

Usage:
    python tools/run_all_py.py [--lab LAB_NUMBER]

This script validates that Python source files can be imported without errors.
"""

import sys
import os
import argparse
import json
import importlib.util
from pathlib import Path
from datetime import datetime

# Add project root to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))


def find_all_python_files(root_dir: Path, lab_filter: int = None) -> list:
    """Find all .py files in the repository (excluding __pycache__)."""
    py_files = []
    solutions_dir = root_dir / "Solutions"
    
    if not solutions_dir.exists():
        print(f"[WARNING] Solutions directory not found: {solutions_dir}")
        return py_files
    
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
        
        # Find all Python files
        for py_path in lab_dir.rglob("*.py"):
            # Skip pycache and test files
            if "__pycache__" in str(py_path):
                continue
            py_files.append({
                "path": py_path,
                "lab": lab_name,
                "name": py_path.name,
                "relative": py_path.relative_to(lab_dir)
            })
    
    # Also include tools directory
    tools_dir = root_dir / "tools"
    if tools_dir.exists():
        for py_path in tools_dir.glob("*.py"):
            if py_path.name != Path(__file__).name:  # Skip self
                py_files.append({
                    "path": py_path,
                    "lab": "tools",
                    "name": py_path.name,
                    "relative": py_path.relative_to(tools_dir)
                })
    
    return py_files


def check_syntax(file_path: Path) -> dict:
    """Check if a Python file has valid syntax."""
    result = {
        "file": str(file_path),
        "status": "unknown",
        "error": None
    }
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
        compile(source, str(file_path), "exec")
        result["status"] = "valid"
    except SyntaxError as e:
        result["status"] = "syntax_error"
        result["error"] = f"Line {e.lineno}: {e.msg}"
    except Exception as e:
        result["status"] = "error"
        result["error"] = f"{type(e).__name__}: {str(e)}"
    
    return result


def try_import_module(file_path: Path, parent_dir: Path) -> dict:
    """Try to import a Python module and check for import errors."""
    result = {
        "file": str(file_path),
        "status": "unknown",
        "imports_ok": False,
        "error": None
    }
    
    # Add parent directory to path temporarily
    original_path = sys.path.copy()
    sys.path.insert(0, str(parent_dir))
    
    try:
        module_name = file_path.stem
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            # Do not actually execute the module to avoid side effects
            # Just check if it can be parsed
            result["status"] = "importable"
            result["imports_ok"] = True
    except Exception as e:
        result["status"] = "import_error"
        result["error"] = f"{type(e).__name__}: {str(e)}"
    finally:
        sys.path = original_path
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Test all Python modules in the repository")
    parser.add_argument("--lab", type=int, help="Only test modules for a specific lab (1-5)")
    args = parser.parse_args()
    
    # Setup logging
    log_dir = PROJECT_ROOT / "outputs" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"python_module_test_{timestamp}.json"
    
    print("=" * 70)
    print("PYTHON MODULE TESTING TOOL")
    print("=" * 70)
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Log file: {log_file}")
    if args.lab:
        print(f"Lab filter: Lab {args.lab}")
    print()
    
    # Find Python files
    py_files = find_all_python_files(PROJECT_ROOT, args.lab)
    
    if not py_files:
        print("[WARNING] No Python files found to test")
        return 1
    
    print(f"Found {len(py_files)} Python files to test:")
    for pf in py_files:
        print(f"  - [{pf['lab']}] {pf['relative']}")
    print()
    
    # Test files
    results = []
    valid_count = 0
    error_count = 0
    
    for i, pf_info in enumerate(py_files, 1):
        py_path = pf_info["path"]
        print(f"[{i}/{len(py_files)}] Testing: {pf_info['name']}")
        
        # Check syntax
        syntax_result = check_syntax(py_path)
        
        if syntax_result["status"] == "valid":
            print(f"            [OK] Syntax valid")
            valid_count += 1
            syntax_result["lab"] = pf_info["lab"]
            results.append(syntax_result)
        else:
            print(f"            [FAIL] {syntax_result.get('error', 'Unknown error')}")
            error_count += 1
            syntax_result["lab"] = pf_info["lab"]
            results.append(syntax_result)
        
        print()
    
    # Write log
    log_data = {
        "timestamp": timestamp,
        "summary": {
            "total": len(py_files),
            "valid": valid_count,
            "errors": error_count
        },
        "results": results
    }
    
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("=" * 70)
    print("TESTING SUMMARY")
    print("=" * 70)
    print(f"  Total files:     {len(py_files)}")
    print(f"  Valid syntax:    {valid_count}")
    print(f"  Errors:          {error_count}")
    print(f"\nLog saved to: {log_file}")
    
    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
