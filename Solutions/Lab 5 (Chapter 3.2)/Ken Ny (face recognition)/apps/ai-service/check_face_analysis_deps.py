#!/usr/bin/env python3
"""
Check if all dependencies for face analysis are installed
"""

import sys

def check_import(module_name, package_name=None):
    """Check if a module can be imported."""
    try:
        __import__(module_name)
        print(f"✅ {package_name or module_name} is installed")
        return True
    except ImportError:
        print(f"❌ {package_name or module_name} is NOT installed")
        return False

def main():
    print("Checking Face Analysis Dependencies...")
    print("=" * 50)
    
    all_ok = True
    
    # Core dependencies
    all_ok &= check_import("cv2", "opencv-python")
    all_ok &= check_import("numpy", "numpy")
    all_ok &= check_import("mtcnn", "mtcnn")
    
    # DeepFace for age/gender
    deepface_ok = check_import("deepface", "deepface")
    if not deepface_ok:
        print("   ⚠️  Age and gender detection will use heuristic (less accurate)")
        print("   Install with: pip install deepface tf-keras")
    
    # FaceNet for embeddings
    facenet_ok = check_import("facenet_pytorch", "facenet-pytorch")
    if not facenet_ok:
        print("   ⚠️  Face comparison will use placeholder embeddings (not accurate)")
        print("   Install with: pip install facenet-pytorch")
    
    # PyTorch (required by facenet-pytorch)
    torch_ok = check_import("torch", "torch")
    if not torch_ok:
        print("   ⚠️  PyTorch is required for FaceNet")
        print("   Install with: pip install torch torchvision")
    
    print("=" * 50)
    
    if all_ok and deepface_ok and facenet_ok and torch_ok:
        print("✅ All dependencies are installed!")
        return 0
    else:
        print("⚠️  Some dependencies are missing. Install missing packages:")
        print("   pip install deepface tf-keras facenet-pytorch torch torchvision")
        return 1

if __name__ == "__main__":
    sys.exit(main())
