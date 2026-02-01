# Lab 4: So sánh sự tương đồng của các hình ảnh sử dụng Wavelet, Python

## 📚 Mục tiêu bài tập

1. Biết cách sử dụng wavelet biến đổi để trích xuất thông tin cụ thể và so sánh sự tương thích giữa các hình ảnh.
2. Làm quen với PyWavelets thư viện và các công cụ xử lý ảnh trong Python.
3. Đánh giá kết quả của hàm băm wavelet phương pháp trong việc xác định các hình ảnh tương thích.

## 📁 Cấu trúc thư mục

```
Lab 4 (Chapter 3.1)/
├── notebooks/
│   └── Lab4_Wavelet_Image_Similarity_AllInOne.ipynb  # Notebook chính (BẮT ĐẦU TỪ ĐÂY)
├── src/
│   ├── __init__.py          # Module init
│   ├── preprocessing.py     # Tiền xử lý ảnh và tạo cặp
│   ├── wavelet_hash.py      # Thuật toán wavelet hash
│   ├── metrics.py           # Các hàm tính metrics
│   └── retrieval.py         # Image retrieval
├── data/
│   ├── raw/                  # Ảnh mẫu để test
│   │   ├── similar/          # Các cặp ảnh tương tự (5 cặp mẫu)
│   │   │   ├── pair1/        # horse & horse_modified
│   │   │   ├── pair2/        # giraffe & giraffe_modified
│   │   │   └── pair3/        # rose & rose_modified
│   │   └── dissimilar/       # Các cặp ảnh khác nhau (2 cặp mẫu)
│   │       ├── pair1/        # horse & rose
│   │       └── pair2/        # dog & giraffe
│   └── processed/
│       ├── pairs.csv         # Danh sách cặp ảnh và nhãn (tự động tạo)
│       └── distances.csv     # Khoảng cách Hamming (tự động tạo)
├── outputs/
│   ├── figures/              # Biểu đồ (ROC, confusion matrix, ...) (tự động tạo)
│   └── tables/               # Bảng kết quả metrics (tự động tạo)
├── archive/                  # Các bài tập cũ (tham khảo)
│   ├── Bài toán cụ thể/      # Notebooks riêng lẻ cũ
│   ├── Bài tập nâng cao/     # Notebooks nâng cao cũ
│   └── Requirements/         # Ảnh đề bài
├── requirements.txt          # Dependencies
└── README.md                 # File này
```

> **Lưu ý**: Các bài tập cũ đã được di chuyển vào thư mục `archive/`. Notebook chính hiện tại là [notebooks/Lab4_Wavelet_Image_Similarity_AllInOne.ipynb](notebooks/Lab4_Wavelet_Image_Similarity_AllInOne.ipynb) đã gom tất cả nội dung lại.

## 🚀 Hướng dẫn cài đặt và chạy

### 1. Cài đặt dependencies

```bash
# Tạo virtual environment (khuyến nghị)
python -m venv .venv

# Kích hoạt (Windows)
.venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt
```

### 2. Chuẩn bị dữ liệu

**Option A: Sử dụng ảnh mẫu từ scikit-image (không cần chuẩn bị gì thêm)**

Notebook sẽ tự động tạo dataset test từ các ảnh mẫu có sẵn trong `skimage.data`.

**Option B: Sử dụng ảnh của bạn**

1. Tạo thư mục `data/raw/similar/` và `data/raw/dissimilar/`
2. Trong mỗi thư mục, tạo các folder con `pair1/`, `pair2/`, ...
3. Mỗi folder pair chứa đúng 2 ảnh
4. Chạy cell đầu tiên trong notebook để tạo `pairs.csv`

### 3. Chạy notebook

```bash
# Mở Jupyter
jupyter notebook notebooks/Lab4_Wavelet_Image_Similarity_AllInOne.ipynb

# Hoặc dùng VS Code với extension Jupyter
```

## 📖 Nội dung bài tập

### I> Mục tiêu bài tập

- Giới thiệu wavelet transform và ứng dụng trong so sánh ảnh

### II> Bài toán cụ thể

1. **Chuẩn bị dữ liệu**: Tạo/load cặp ảnh similar/dissimilar
2. **Trích xuất wavelet đặc biệt**: DWT với PyWavelets
3. **Tạo mã băm wavelet**: Lượng tử hóa coefficients thành bit
4. **So sánh hàm băm**: Tính khoảng cách Hamming
5. **Đánh giá**: Accuracy, Sensitivity, Specificity, ROC curve

### III> Bài tập nâng cao

1. **So sánh phương pháp**: Khảo sát wavelet types, levels, quantization methods
2. **Image Retrieval**: Tìm kiếm ảnh tương tự trong gallery

## ⚙️ Cấu hình mặc định

| Tham số      | Giá trị    | Mô tả                                       |
| ------------ | ---------- | ------------------------------------------- |
| wavelet      | "haar"     | Loại wavelet (db2, db4, sym2 cũng phổ biến) |
| level        | 2          | Số cấp phân rã DWT                          |
| subband_mode | "LL"       | Lấy approximation band                      |
| quant_method | "median"   | Lượng tử theo ngưỡng median                 |
| hash_bits    | 256        | Độ dài hash                                 |
| image_size   | (256, 256) | Kích thước chuẩn hóa                        |

## 📊 Outputs mong đợi

- `outputs/figures/sample_pairs.png`: Hiển thị cặp ảnh mẫu
- `outputs/figures/wavelet_decomposition.png`: Phân rã wavelet
- `outputs/figures/confusion_matrix.png`: Confusion matrix
- `outputs/figures/roc_curve.png`: Đường cong ROC
- `outputs/figures/methods_comparison.png`: So sánh các phương pháp
- `outputs/figures/retrieval_demo.png`: Demo image retrieval
- `outputs/tables/distances.csv`: Khoảng cách Hamming các cặp
- `outputs/tables/metrics_comparison.csv`: Bảng so sánh metrics

## 🔧 Troubleshooting

**Q: Lỗi `ModuleNotFoundError: No module named 'src'`**

A: Chạy notebook từ thư mục gốc của Lab 4, hoặc thêm cell sau ở đầu notebook:

```python
import sys
sys.path.insert(0, '..')
```

**Q: Không có ảnh để test**

A: Notebook sử dụng `skimage.data` nên không cần chuẩn bị ảnh. Các ảnh mẫu được load tự động.

**Q: ROC AUC thấp**

A: Thử các tham số khác:

- Tăng `level` lên 3 hoặc 4
- Đổi wavelet sang `db2` hoặc `db4`
- Tăng `hash_bits` lên 512

## 📚 Tài liệu tham khảo

1. PyWavelets Documentation: https://pywavelets.readthedocs.io/
2. Wavelet-based Image Hashing: https://en.wikipedia.org/wiki/Wavelet_Hash
3. ROC Curve: https://scikit-learn.org/stable/modules/model_evaluation.html#roc-metrics

## 👤 Tác giả

- Bài thực hành 4 - Môn học CVIP
- Đại học Công nghệ TP.HCM (UTH)
