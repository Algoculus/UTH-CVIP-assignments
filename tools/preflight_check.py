#!/usr/bin/env python3
"""
Preflight Check Tool
====================
Validates dataset locations, required files, and dependencies before running notebooks.

Usage:
    python tools/preflight_check.py [--lab LAB_NUMBER]

This script checks:
1. Required data directories and files
2. Python dependencies
3. Output directories
4. Environment configuration
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


# Define expected structure for each lab
LAB_REQUIREMENTS = {
    "Lab 1": {
        "description": "Basic Image Operations",
        "data_dirs": [],
        "data_files": [],
        "notebooks": [
            "Exercise 1/lab1-ex1.ipynb",
            "Exercise 2/lab1-ex2.ipynb",
            "Exercise 3/lab1-ex3.ipynb",
            "Exercise 4/lab1-ex4.ipynb",
        ],
        "output_dirs": [],
        "dependencies": ["numpy", "PIL", "matplotlib", "opencv-python"]
    },
    "Lab 2 (Chapter 2.1)": {
        "description": "Point Operators and Linear Filtering",
        "data_dirs": [],
        "data_files": [],
        "notebooks": [
            "I - Toán tử điểm ảnh/Exercise 1/brightness_adjustment.ipynb",
            "I - Toán tử điểm ảnh/Exercise 2/contrast_adjustment.ipynb",
            "II - Lọc tuyến tính/Exercise 1/average_filtering.ipynb",
        ],
        "output_dirs": [],
        "dependencies": ["numpy", "PIL", "matplotlib", "opencv-python"]
    },
    "Lab 3 (Chapter 2.2)": {
        "description": "Edge Detection with Canny",
        "data_dirs": [],
        "data_files": [],
        "notebooks": [
            "II - Bài tập thực hành/Exercise 1/canny_opencv.ipynb",
            "II - Bài tập thực hành/Exercise 2/lab3_ex2_canny_edge_detection.ipynb",
        ],
        "output_dirs": [],
        "dependencies": ["numpy", "PIL", "matplotlib", "opencv-python", "skimage"]
    },
    "Lab 4 (Chapter 3.1)": {
        "description": "Wavelet Image Similarity",
        "data_dirs": [
            "data/raw/similar",
            "data/raw/dissimilar"
        ],
        "data_files": [],
        "notebooks": [
            "notebooks/Lab4_Wavelet_Image_Similarity_AllInOne.ipynb"
        ],
        "output_dirs": [
            "outputs/figures",
            "outputs/tables"
        ],
        "source_modules": [
            "src/__init__.py",
            "src/preprocessing.py",
            "src/wavelet_hash.py",
            "src/metrics.py",
            "src/retrieval.py"
        ],
        "dependencies": ["numpy", "PIL", "matplotlib", "pywt", "sklearn", "skimage", "pandas", "seaborn"]
    },
    "Lab 5 (Chapter 3.2)": {
        "description": "Face Recognition (Real-time with webcam)",
        "data_dirs": [],
        "data_files": [],
        "notebooks": [
            "Gia Luat (face matching)/face-matching.ipynb",
            "Phu Thuan (face detection and recognition)/lab5_realtime_face_recognition.ipynb",
            "Thanh Duy (face recognition)/lab5_face_recognition.ipynb",
        ],
        "output_dirs": [],
        "dependencies": ["numpy", "PIL", "opencv-python", "torch", "mtcnn"],
        "optional_dependencies": {
            "PyTorch backend": ["torch", "torchvision", "facenet-pytorch"],
            "TensorFlow backend": ["tensorflow", "keras-facenet"],
            "FastAPI backend (Ken Ny)": ["fastapi", "uvicorn", "deepface", "pydantic"]
        },
        "webcam_required": True
    }
}


def check_directory_exists(base_dir: Path, rel_path: str) -> dict:
    """Check if a directory exists."""
    full_path = base_dir / rel_path
    return {
        "path": rel_path,
        "exists": full_path.exists() and full_path.is_dir(),
        "full_path": str(full_path)
    }


def check_file_exists(base_dir: Path, rel_path: str) -> dict:
    """Check if a file exists."""
    full_path = base_dir / rel_path
    return {
        "path": rel_path,
        "exists": full_path.exists() and full_path.is_file(),
        "full_path": str(full_path)
    }


def check_dependency(package_name: str) -> dict:
    """Check if a Python package is installed."""
    result = {
        "package": package_name,
        "installed": False,
        "version": None
    }
    
    # Map common names to import names
    import_map = {
        "PIL": "PIL",
        "Pillow": "PIL",
        "opencv-python": "cv2",
        "scikit-learn": "sklearn",
        "scikit-image": "skimage",
        "PyWavelets": "pywt",
        "pywt": "pywt",
        "face_recognition": "face_recognition",
    }
    
    import_name = import_map.get(package_name, package_name)
    
    try:
        module = __import__(import_name)
        result["installed"] = True
        if hasattr(module, "__version__"):
            result["version"] = module.__version__
        elif hasattr(module, "VERSION"):
            result["version"] = str(module.VERSION)
    except ImportError:
        pass
    
    return result


def run_preflight_check(lab_filter: int = None) -> dict:
    """Run preflight checks for all labs."""
    solutions_dir = PROJECT_ROOT / "Solutions"
    
    all_results = {
        "timestamp": datetime.now().isoformat(),
        "project_root": str(PROJECT_ROOT),
        "labs": {}
    }
    
    for lab_name, requirements in LAB_REQUIREMENTS.items():
        # Extract lab number
        try:
            lab_num = int(lab_name.split()[1]) if "Lab" in lab_name else None
        except (IndexError, ValueError):
            lab_num = None
        
        # Apply filter
        if lab_filter is not None and lab_num != lab_filter:
            continue
        
        lab_dir = solutions_dir / lab_name
        
        lab_result = {
            "description": requirements["description"],
            "directory_exists": lab_dir.exists(),
            "data_dirs": [],
            "data_files": [],
            "notebooks": [],
            "output_dirs": [],
            "source_modules": [],
            "dependencies": [],
            "issues": [],
            "recommendations": []
        }
        
        if not lab_dir.exists():
            lab_result["issues"].append(f"Lab directory not found: {lab_dir}")
            all_results["labs"][lab_name] = lab_result
            continue
        
        # Check data directories
        for rel_path in requirements.get("data_dirs", []):
            check = check_directory_exists(lab_dir, rel_path)
            lab_result["data_dirs"].append(check)
            if not check["exists"]:
                lab_result["issues"].append(f"Missing data directory: {rel_path}")
                lab_result["recommendations"].append(f"Create directory: {check['full_path']}")
        
        # Check notebooks
        for rel_path in requirements.get("notebooks", []):
            check = check_file_exists(lab_dir, rel_path)
            lab_result["notebooks"].append(check)
            if not check["exists"]:
                lab_result["issues"].append(f"Missing notebook: {rel_path}")
        
        # Check output directories
        for rel_path in requirements.get("output_dirs", []):
            check = check_directory_exists(lab_dir, rel_path)
            lab_result["output_dirs"].append(check)
            if not check["exists"]:
                lab_result["recommendations"].append(f"Create output directory: {check['full_path']}")
        
        # Check source modules
        for rel_path in requirements.get("source_modules", []):
            check = check_file_exists(lab_dir, rel_path)
            lab_result["source_modules"].append(check)
            if not check["exists"]:
                lab_result["issues"].append(f"Missing source module: {rel_path}")
        
        # Check dependencies
        for package in requirements.get("dependencies", []):
            check = check_dependency(package)
            lab_result["dependencies"].append(check)
            if not check["installed"]:
                lab_result["issues"].append(f"Missing package: {package}")
                lab_result["recommendations"].append(f"Install package: pip install {package}")
        
        all_results["labs"][lab_name] = lab_result
    
    return all_results


def print_results(results: dict):
    """Print preflight check results in a readable format."""
    print("=" * 70)
    print("PREFLIGHT CHECK RESULTS")
    print("=" * 70)
    print(f"Project root: {results['project_root']}")
    print(f"Timestamp: {results['timestamp']}")
    print()
    
    total_issues = 0
    total_recommendations = 0
    
    for lab_name, lab_result in results["labs"].items():
        print(f"\n{'='*70}")
        print(f"  {lab_name}")
        print(f"  {lab_result['description']}")
        print(f"{'='*70}")
        
        # Directory status
        status = "[OK]" if lab_result["directory_exists"] else "[MISSING]"
        print(f"  Directory: {status}")
        
        # Data directories
        if lab_result["data_dirs"]:
            print(f"\n  Data Directories:")
            for check in lab_result["data_dirs"]:
                status = "[OK]" if check["exists"] else "[MISSING]"
                print(f"    {status} {check['path']}")
        
        # Notebooks
        if lab_result["notebooks"]:
            print(f"\n  Notebooks:")
            for check in lab_result["notebooks"]:
                status = "[OK]" if check["exists"] else "[MISSING]"
                print(f"    {status} {check['path']}")
        
        # Source modules
        if lab_result["source_modules"]:
            print(f"\n  Source Modules:")
            for check in lab_result["source_modules"]:
                status = "[OK]" if check["exists"] else "[MISSING]"
                print(f"    {status} {check['path']}")
        
        # Dependencies
        if lab_result["dependencies"]:
            print(f"\n  Dependencies:")
            for check in lab_result["dependencies"]:
                if check["installed"]:
                    version = f" ({check['version']})" if check["version"] else ""
                    print(f"    [OK] {check['package']}{version}")
                else:
                    print(f"    [MISSING] {check['package']}")
        
        # Issues
        issues = lab_result.get("issues", [])
        if issues:
            print(f"\n  Issues ({len(issues)}):")
            for issue in issues:
                print(f"    - {issue}")
            total_issues += len(issues)
        
        # Recommendations
        recommendations = lab_result.get("recommendations", [])
        if recommendations:
            print(f"\n  Recommendations:")
            for rec in recommendations:
                print(f"    -> {rec}")
            total_recommendations += len(recommendations)
    
    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    print(f"  Labs checked: {len(results['labs'])}")
    print(f"  Total issues: {total_issues}")
    print(f"  Recommendations: {total_recommendations}")
    
    if total_issues == 0:
        print("\n  [PASS] All preflight checks passed!")
    else:
        print(f"\n  [WARN] {total_issues} issue(s) require attention")


def main():
    parser = argparse.ArgumentParser(description="Run preflight checks for the repository")
    parser.add_argument("--lab", type=int, help="Only check a specific lab (1-5)")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()
    
    # Run checks
    results = run_preflight_check(args.lab)
    
    # Setup logging
    log_dir = PROJECT_ROOT / "outputs" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"preflight_check_{timestamp}.json"
    
    # Save results
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Print results
    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print_results(results)
        print(f"\nDetailed results saved to: {log_file}")
    
    # Return exit code based on issues
    total_issues = sum(len(lab.get("issues", [])) for lab in results["labs"].values())
    return 0 if total_issues == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
