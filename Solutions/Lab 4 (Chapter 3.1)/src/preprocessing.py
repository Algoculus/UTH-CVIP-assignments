"""
Preprocessing Module
====================
Các hàm tiền xử lý ảnh và tạo cặp ảnh để đánh giá.
"""

import numpy as np
from PIL import Image
from pathlib import Path
from typing import List, Tuple, Optional, Union
import csv

# Các định dạng ảnh hỗ trợ
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}


def load_and_preprocess(
    image_path: Union[str, Path],
    size: Tuple[int, int] = (256, 256),
    grayscale: bool = True
) -> np.ndarray:
    """
    Đọc ảnh, chuyển sang grayscale (nếu cần) và resize về kích thước chuẩn.
    
    Parameters
    ----------
    image_path : str or Path
        Đường dẫn tới file ảnh.
    size : tuple
        Kích thước (width, height) để resize.
    grayscale : bool
        Nếu True, chuyển ảnh sang grayscale.
        
    Returns
    -------
    np.ndarray
        Mảng numpy chứa ảnh đã xử lý, dtype float32.
    """
    img = Image.open(image_path)
    
    if grayscale:
        img = img.convert("L")
    else:
        img = img.convert("RGB")
        
    img = img.resize(size, Image.BILINEAR)
    arr = np.asarray(img, dtype=np.float32)
    
    return arr


def load_image_array(image_input: Union[str, Path, np.ndarray], size: Tuple[int, int] = (256, 256)) -> np.ndarray:
    """
    Load ảnh từ path hoặc trả về nếu đã là numpy array.
    
    Parameters
    ----------
    image_input : str, Path, or np.ndarray
        Đường dẫn tới ảnh hoặc mảng numpy.
    size : tuple
        Kích thước chuẩn hóa.
        
    Returns
    -------
    np.ndarray
        Ảnh grayscale dạng float32.
    """
    if isinstance(image_input, np.ndarray):
        # Đã là array, chuẩn hóa về grayscale nếu cần
        if len(image_input.shape) == 3:
            # RGB -> Grayscale sử dụng công thức luminance
            arr = 0.299 * image_input[:, :, 0] + 0.587 * image_input[:, :, 1] + 0.114 * image_input[:, :, 2]
            arr = arr.astype(np.float32)
        else:
            arr = image_input.astype(np.float32)
        
        # Resize nếu kích thước khác
        from PIL import Image
        if arr.shape != (size[1], size[0]):
            img = Image.fromarray(arr.astype(np.uint8))
            img = img.resize(size, Image.BILINEAR)
            arr = np.asarray(img, dtype=np.float32)
        return arr
    else:
        return load_and_preprocess(image_input, size=size, grayscale=True)


def create_image_pairs_from_folder(
    root_dir: Union[str, Path],
    output_csv: Optional[Union[str, Path]] = None
) -> List[Tuple[str, str, int]]:
    """
    Thu thập các cặp ảnh similar/dissimilar từ cấu trúc thư mục.
    
    Cấu trúc thư mục mong đợi:
    root_dir/
        similar/
            pair1/
                image_a.jpg
                image_b.jpg
            pair2/
                ...
        dissimilar/
            pair1/
                image_a.jpg
                image_b.jpg
            ...
    
    Parameters
    ----------
    root_dir : str or Path
        Thư mục gốc chứa similar/ và dissimilar/.
    output_csv : str or Path, optional
        Đường dẫn lưu file CSV chứa danh sách cặp.
        
    Returns
    -------
    list of tuples
        Danh sách (path1, path2, label) với label=1 cho similar, 0 cho dissimilar.
    """
    root_dir = Path(root_dir)
    pairs = []
    
    for label_name, label_value in [("similar", 1), ("dissimilar", 0)]:
        label_dir = root_dir / label_name
        
        if not label_dir.is_dir():
            print(f"[WARNING] Không tìm thấy thư mục: {label_dir}")
            continue
            
        for pair_dir in sorted(label_dir.iterdir()):
            if not pair_dir.is_dir():
                continue
                
            # Tìm các file ảnh trong thư mục cặp
            image_files = sorted([
                f for f in pair_dir.iterdir() 
                if f.suffix.lower() in SUPPORTED_EXTENSIONS
            ])
            
            if len(image_files) != 2:
                print(f"[WARNING] Bỏ qua {pair_dir.name}: mong đợi 2 ảnh, tìm thấy {len(image_files)}")
                continue
                
            pairs.append((
                str(image_files[0]),
                str(image_files[1]),
                label_value
            ))
    
    if not pairs:
        raise RuntimeError(
            f"Không tìm thấy cặp ảnh hợp lệ trong {root_dir}.\n"
            "Kiểm tra cấu trúc thư mục: root/similar/pair*/img1,img2 và root/dissimilar/pair*/img1,img2"
        )
    
    # Lưu ra CSV nếu được yêu cầu
    if output_csv is not None:
        output_csv = Path(output_csv)
        output_csv.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['image1', 'image2', 'label'])
            for p1, p2, label in pairs:
                writer.writerow([p1, p2, label])
        print(f"[OK] Đã lưu danh sách cặp vào: {output_csv}")
    
    return pairs


def generate_synthetic_pairs(
    num_similar: int = 10,
    num_dissimilar: int = 10,
    seed: int = 42
) -> Tuple[List[Tuple[np.ndarray, np.ndarray, str]], np.ndarray]:
    """
    Tạo dataset test gồm các cặp ảnh tổng hợp từ scikit-image.
    
    Sử dụng các ảnh mẫu có sẵn và tạo biến thể (nhiễu, xoay, scale, brightness)
    để tạo cặp tương tự, và các ảnh khác nội dung cho cặp không tương tự.
    
    Parameters
    ----------
    num_similar : int
        Số lượng tối đa cặp tương tự.
    num_dissimilar : int
        Số lượng tối đa cặp không tương tự.
    seed : int
        Random seed để tái lập kết quả.
        
    Returns
    -------
    image_pairs : list of tuples
        Danh sách (img1, img2, description).
    labels : np.ndarray
        Mảng nhãn (1=similar, 0=dissimilar).
    """
    np.random.seed(seed)
    
    # Import ảnh mẫu từ skimage
    try:
        from skimage import data
    except ImportError:
        raise ImportError("Cần cài đặt scikit-image: pip install scikit-image")
    
    # Load các ảnh mẫu
    img_camera = data.camera()  # 512x512 grayscale
    img_astronaut = data.astronaut()  # 512x512 RGB
    img_coins = data.coins()  # 303x384 grayscale
    img_moon = data.moon()  # 512x512 grayscale
    img_text = data.text()  # 172x448 grayscale
    
    # Chuyển astronaut sang grayscale
    astronaut_gray = (
        0.299 * img_astronaut[:, :, 0] + 
        0.587 * img_astronaut[:, :, 1] + 
        0.114 * img_astronaut[:, :, 2]
    ).astype(np.uint8)
    
    # Hàm tạo biến thể
    def add_noise(img, std=10):
        """Thêm nhiễu Gaussian"""
        noisy = img.astype(np.float32) + np.random.normal(0, std, img.shape)
        return np.clip(noisy, 0, 255).astype(np.uint8)
    
    def rotate_90(img):
        """Xoay 90 độ"""
        return np.rot90(img)
    
    def adjust_brightness(img, factor=1.3):
        """Điều chỉnh độ sáng"""
        return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)
    
    def scale_down_up(img, intermediate_size=300):
        """Scale xuống rồi lên (mất chất lượng)"""
        from PIL import Image
        pil_img = Image.fromarray(img)
        h, w = img.shape[:2]
        small = pil_img.resize((intermediate_size, intermediate_size), Image.BILINEAR)
        back = small.resize((w, h), Image.BILINEAR)
        return np.array(back)
    
    similar_pairs = []
    dissimilar_pairs = []
    
    # === Tạo cặp TƯƠNG TỰ ===
    # Camera variations
    similar_pairs.append((img_camera, add_noise(img_camera, std=10), "Camera - Camera+Noise"))
    similar_pairs.append((img_camera, rotate_90(img_camera), "Camera - Camera+Rotate90"))
    similar_pairs.append((img_camera, adjust_brightness(img_camera, 1.3), "Camera - Camera+Bright"))
    similar_pairs.append((img_camera, scale_down_up(img_camera), "Camera - Camera+Scaled"))
    
    # Astronaut variations
    similar_pairs.append((astronaut_gray, add_noise(astronaut_gray, std=8), "Astronaut - Astronaut+Noise"))
    similar_pairs.append((astronaut_gray, rotate_90(astronaut_gray), "Astronaut - Astronaut+Rotate90"))
    
    # Moon variations
    similar_pairs.append((img_moon, add_noise(img_moon, std=12), "Moon - Moon+Noise"))
    similar_pairs.append((img_moon, adjust_brightness(img_moon, 0.8), "Moon - Moon+Dark"))
    
    # Coins variations
    similar_pairs.append((img_coins, add_noise(img_coins, std=15), "Coins - Coins+Noise"))
    similar_pairs.append((img_coins, adjust_brightness(img_coins, 1.2), "Coins - Coins+Bright"))
    
    # === Tạo cặp KHÔNG TƯƠNG TỰ ===
    all_images = [
        (img_camera, "Camera"),
        (astronaut_gray, "Astronaut"),
        (img_coins, "Coins"),
        (img_moon, "Moon"),
        (img_text, "Text"),
    ]
    
    for i in range(len(all_images)):
        for j in range(i + 1, len(all_images)):
            img1, name1 = all_images[i]
            img2, name2 = all_images[j]
            dissimilar_pairs.append((img1, img2, f"{name1} - {name2}"))
    
    # Giới hạn số lượng
    similar_pairs = similar_pairs[:num_similar]
    dissimilar_pairs = dissimilar_pairs[:num_dissimilar]
    
    # Gộp lại
    image_pairs = []
    labels = []
    
    for img1, img2, desc in similar_pairs:
        image_pairs.append((img1, img2, desc))
        labels.append(1)
    
    for img1, img2, desc in dissimilar_pairs:
        image_pairs.append((img1, img2, desc))
        labels.append(0)
    
    return image_pairs, np.array(labels)


def save_pairs_to_csv(
    pairs: List[Tuple],
    output_path: Union[str, Path],
    has_description: bool = False
):
    """
    Lưu danh sách cặp ảnh vào file CSV.
    
    Parameters
    ----------
    pairs : list
        Danh sách các tuple (path1, path2, label) hoặc (path1, path2, label, desc).
    output_path : str or Path
        Đường dẫn file CSV đầu ra.
    has_description : bool
        Nếu True, mỗi tuple có thêm trường description.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        if has_description:
            writer.writerow(['image1', 'image2', 'label', 'description'])
        else:
            writer.writerow(['image1', 'image2', 'label'])
            
        for row in pairs:
            writer.writerow(row)
    
    print(f"[OK] Đã lưu {len(pairs)} cặp ảnh vào: {output_path}")


def load_pairs_from_csv(csv_path: Union[str, Path]) -> List[Tuple[str, str, int]]:
    """
    Đọc danh sách cặp ảnh từ file CSV.
    
    Parameters
    ----------
    csv_path : str or Path
        Đường dẫn file CSV.
        
    Returns
    -------
    list of tuples
        Danh sách (image1_path, image2_path, label).
    """
    pairs = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pairs.append((
                row['image1'],
                row['image2'],
                int(row['label'])
            ))
    
    return pairs
