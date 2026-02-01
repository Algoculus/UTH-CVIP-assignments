# UTH CVIP Assignments 🚀

Repository for **Computer Vision and Image Processing (CVIP)** course assignments at **University of Transport Ho Chi Minh City (UTH)**.

## 📚 Overview

This repository contains comprehensive solutions for all labs:

- ✅ **Lab 1**: Basic Image Operations (PIL, OpenCV, Matplotlib)
- ✅ **Lab 2**: Point Operators and Linear Filtering
- ✅ **Lab 3**: Edge Detection with Canny Algorithm
- ✅ **Lab 4**: Wavelet-based Image Similarity (PyWavelets, scikit-learn)
- ✅ **Lab 5**: Real-time Face Recognition (FaceNet, MTCNN, PyTorch)

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Webcam (for Lab 5 real-time face recognition)
- Optional: CUDA-capable GPU or Apple Silicon Mac (for Lab 5 acceleration)

### Quick Start

#### 1. Clone the repository

```bash
git clone <repository-url>
cd UTH-CVIP-assignments
```

#### 2. Create virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt

# For Lab 5 - Install MTCNN (face detection)
pip install mtcnn

# For Lab 5 - Choose PyTorch OR TensorFlow backend
# Option A: PyTorch (recommended, already in requirements.txt)
# Already installed via requirements.txt

# Option B: TensorFlow (alternative)
# pip install tensorflow>=2.10.0 keras-facenet tf-keras
```

#### 4. Verify installation

```bash
python tools/preflight_check.py
```

Expected output: `[PASS] All preflight checks passed!`

## 🚀 Running the Labs

### Run All Notebooks

```bash
# Execute all labs (generates logs in outputs/logs/)
python tools/run_all_notebooks.py --continue-on-error

# Execute specific lab only
python tools/run_all_notebooks.py --lab 4

# With custom timeout
python tools/run_all_notebooks.py --timeout 600
```

### Run Individual Lab Notebooks

#### Lab 1-3: Use Jupyter

```bash
jupyter notebook
# Navigate to Solutions/Lab X/... and run the notebooks
```

#### Lab 4: Wavelet Image Similarity

```bash
jupyter notebook "Solutions/Lab 4 (Chapter 3.1)/notebooks/Lab4_Wavelet_Image_Similarity_AllInOne.ipynb"
```

#### Lab 5: Face Recognition

Each team member has their own implementation:

**Gia Luat** (keras-facenet + MTCNN):

```bash
# Add your reference face images to known/ folder
jupyter notebook "Solutions/Lab 5 (Chapter 3.2)/Gia Luat (face matching)/face-matching.ipynb"
```

**Phu Thuan** (facenet-pytorch + MTCNN):

```bash
# Add reference faces to reference_faces/ folder
jupyter notebook "Solutions/Lab 5 (Chapter 3.2)/Phu Thuan (face detection and recognition)/lab5_realtime_face_recognition.ipynb"
```

**Thanh Duy** (facenet-pytorch + MPS/CUDA):

```bash
jupyter notebook "Solutions/Lab 5 (Chapter 3.2)/Thanh Duy (face recognition)/lab5_face_recognition.ipynb"
```

**Ken Ny** (FastAPI backend):

```bash
cd "Solutions/Lab 5 (Chapter 3.2)/Ken Ny (face recognition)/apps/ai-service"
pip install -r requirements.txt
uvicorn app.main:app --reload
# Open web interface at http://localhost:8000
```

## 📁 Repository Structure

```
UTH-CVIP-assignments/
├── README.md                    # This file
├── requirements.txt             # Consolidated Python dependencies
├── tools/                       # Automation scripts
│   ├── preflight_check.py       # Validate environment setup
│   ├── run_all_notebooks.py     # Execute all notebooks
│   └── run_all_py.py            # Test Python scripts
├── outputs/                     # Generated outputs and logs
│   ├── logs/                    # Execution logs (preflight, notebook runs)
│   ├── figures/                 # Generated plots and visualizations
│   └── tables/                  # Results tables (CSV)
└── Solutions/                   # Lab implementations
    ├── Lab 1/                   # Basic image operations
    ├── Lab 2 (Chapter 2.1)/     # Point operators, filtering
    ├── Lab 3 (Chapter 2.2)/     # Edge detection
    ├── Lab 4 (Chapter 3.1)/     # Wavelet similarity
    │   ├── notebooks/           # Consolidated notebook
    │   ├── src/                 # Source modules
    │   ├── data/                # Dataset storage
    │   ├── outputs/             # Results (figures, tables, models)
    │   └── reports/             # Lab reports
    └── Lab 5 (Chapter 3.2)/     # Face recognition (4 implementations)
        ├── Gia Luat (face matching)/
        ├── Phu Thuan (face detection and recognition)/
        ├── Thanh Duy (face recognition)/
        └── Ken Ny (face recognition)/
```

## 🧪 Testing & Validation

### Check Environment

```bash
# Full environment check
python tools/preflight_check.py

# Check specific lab
python tools/preflight_check.py --lab 5

# JSON output
python tools/preflight_check.py --json > check.json
```

### Execute Notebooks

```bash
# Run all notebooks
python tools/run_all_notebooks.py --continue-on-error

# View execution logs
ls outputs/logs/notebook_execution_*.json
```

## 🔧 Troubleshooting

### Common Issues

**Issue**: `ModuleNotFoundError: No module named 'mtcnn'`

```bash
pip install mtcnn
```

**Issue**: `ModuleNotFoundError: No module named 'pywt'`

```bash
pip install PyWavelets
```

**Issue**: Webcam not detected (Lab 5)

- Windows: Check webcam permissions in Settings > Privacy > Camera
- Linux: Verify /dev/video0 exists, check permissions
- Mac: Grant Terminal/VS Code camera access in System Preferences

**Issue**: Lab 5 CUDA out of memory

```bash
# Use CPU-only mode (slower but works)
# Edit notebook: device = torch.device("cpu")
```

**Issue**: Lab 5 TensorFlow vs PyTorch conflicts

```bash
# Lab 5 implementations use DIFFERENT backends
# Gia Luat: keras-facenet (TensorFlow)
# Phu Thuan/Thanh Duy: facenet-pytorch (PyTorch)
# Install only what you need for your chosen implementation
```

## 📊 Generated Outputs

Each lab generates outputs in its respective directory:

- **Lab 4**: `outputs/figures/*.png`, `outputs/tables/*.csv`, `outputs/models/*.joblib`
- **Lab 5**: `captures/*.jpg` (Phu Thuan's implementation)
- **Logs**: `outputs/logs/` for all execution logs

## 👥 Contributors

- Quách Phú Thuận
- Lê Phạm Thanh Duy
- Cao Bảo Gia Luật
- Nguyễn Ken Ny
- Nguyễn Anh Đức

## 📌 Course Information

- **Course**: Computer Vision and Image Processing (CVIP)
- **Institution**: University of Transport Ho Chi Minh City (UTH)
- **Academic Year**: 2025-2026

## 📄 License

Educational use only. All rights reserved by contributors.

---

✨ _Made with teamwork at UTH_ 🎓
