"""
Image Retrieval Module
======================
Các hàm xây dựng ứng dụng tìm kiếm hình ảnh dựa trên wavelet hash.
"""

import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any, Union, Optional
import matplotlib.pyplot as plt

from .wavelet_hash import wavelet_hash, WaveletHashConfig, DEFAULT_CONFIG
from .metrics import hamming_distance
from .preprocessing import SUPPORTED_EXTENSIONS


def build_hash_gallery(
    image_dir: Union[str, Path],
    config: Optional[WaveletHashConfig] = None,
    recursive: bool = True,
    verbose: bool = True,
    **hash_kwargs
) -> Dict[str, Dict[str, Any]]:
    """
    Xây dựng gallery hash cho tất cả ảnh trong thư mục.
    
    Parameters
    ----------
    image_dir : str or Path
        Thư mục chứa ảnh.
    config : WaveletHashConfig, optional
        Cấu hình wavelet hash.
    recursive : bool
        Nếu True, tìm ảnh trong các thư mục con.
    verbose : bool
        Hiển thị tiến trình.
    **hash_kwargs
        Tham số bổ sung cho wavelet_hash.
        
    Returns
    -------
    dict
        Dictionary {image_path: hash_result}
    """
    image_dir = Path(image_dir)
    
    if config is None:
        config = DEFAULT_CONFIG
    
    gallery = {}
    
    # Tìm tất cả ảnh
    if recursive:
        image_files = [
            f for f in image_dir.rglob("*")
            if f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]
    else:
        image_files = [
            f for f in image_dir.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]
    
    if verbose:
        print(f"[INFO] Tìm thấy {len(image_files)} ảnh trong {image_dir}")
    
    for i, img_path in enumerate(image_files):
        try:
            result = wavelet_hash(img_path, config=config, **hash_kwargs)
            gallery[str(img_path)] = result
            
            if verbose and (i + 1) % 10 == 0:
                print(f"  Đã xử lý: {i + 1}/{len(image_files)}")
        except Exception as e:
            if verbose:
                print(f"  [WARNING] Lỗi với {img_path.name}: {e}")
    
    if verbose:
        print(f"[OK] Đã tạo gallery với {len(gallery)} ảnh")
    
    return gallery


def build_hash_gallery_from_arrays(
    images: List[np.ndarray],
    names: Optional[List[str]] = None,
    config: Optional[WaveletHashConfig] = None,
    **hash_kwargs
) -> Dict[str, Dict[str, Any]]:
    """
    Xây dựng gallery hash từ danh sách mảng numpy.
    
    Parameters
    ----------
    images : list of np.ndarray
        Danh sách ảnh dạng numpy array.
    names : list of str, optional
        Tên cho mỗi ảnh. Nếu None, dùng "image_0", "image_1", ...
    config : WaveletHashConfig, optional
        Cấu hình wavelet hash.
    **hash_kwargs
        Tham số bổ sung.
        
    Returns
    -------
    dict
        Dictionary {name: hash_result}
    """
    if names is None:
        names = [f"image_{i}" for i in range(len(images))]
    
    if len(names) != len(images):
        raise ValueError("Số lượng names phải bằng số lượng images")
    
    if config is None:
        config = DEFAULT_CONFIG
    
    gallery = {}
    
    for name, img in zip(names, images):
        result = wavelet_hash(img, config=config, **hash_kwargs)
        gallery[name] = result
    
    return gallery


def retrieve_similar_images(
    query: Union[str, Path, np.ndarray],
    gallery: Dict[str, Dict[str, Any]],
    top_k: int = 5,
    config: Optional[WaveletHashConfig] = None,
    max_distance: Optional[int] = None,
    **hash_kwargs
) -> List[Tuple[str, int, float]]:
    """
    Tìm kiếm top-k ảnh tương tự nhất với query trong gallery.
    
    Parameters
    ----------
    query : str, Path, or np.ndarray
        Ảnh query.
    gallery : dict
        Gallery hash từ build_hash_gallery().
    top_k : int
        Số lượng kết quả trả về.
    config : WaveletHashConfig, optional
        Cấu hình hash (phải khớp với config dùng để tạo gallery).
    max_distance : int, optional
        Ngưỡng distance tối đa. Nếu set, chỉ trả về ảnh có distance <= max_distance.
    **hash_kwargs
        Tham số bổ sung cho wavelet_hash.
        
    Returns
    -------
    list of tuples
        Danh sách (image_path, hamming_distance, similarity_score) sắp xếp theo distance tăng dần.
    """
    if config is None:
        config = DEFAULT_CONFIG
    
    # Tính hash của query
    query_result = wavelet_hash(query, config=config, **hash_kwargs)
    query_hash = query_result['hash_bits']
    hash_bits = len(query_hash)
    
    # Tính khoảng cách với tất cả ảnh trong gallery
    results = []
    
    for img_path, gallery_result in gallery.items():
        gallery_hash = gallery_result['hash_bits']
        dist = hamming_distance(query_hash, gallery_hash)
        
        # Lọc theo max_distance nếu có
        if max_distance is not None and dist > max_distance:
            continue
        
        # Tính similarity score (1 - normalized distance)
        similarity = 1.0 - (dist / hash_bits)
        
        results.append((img_path, dist, similarity))
    
    # Sắp xếp theo distance tăng dần
    results.sort(key=lambda x: x[1])
    
    # Trả về top-k
    return results[:top_k]


def display_retrieval_results(
    query: Union[str, Path, np.ndarray],
    results: List[Tuple[str, int, float]],
    figsize: Tuple[int, int] = (16, 4),
    max_display: int = 5,
    save_path: Optional[str] = None
) -> None:
    """
    Hiển thị kết quả retrieval.
    
    Parameters
    ----------
    query : str, Path, or np.ndarray
        Ảnh query.
    results : list of tuples
        Kết quả từ retrieve_similar_images().
    figsize : tuple
        Kích thước figure.
    max_display : int
        Số lượng kết quả hiển thị tối đa.
    save_path : str, optional
        Đường dẫn lưu hình.
    """
    from PIL import Image
    
    # Giới hạn số lượng hiển thị
    results_to_show = results[:max_display]
    n_results = len(results_to_show)
    
    # Tạo figure
    n_cols = n_results + 1  # +1 cho query
    fig, axes = plt.subplots(1, n_cols, figsize=figsize)
    
    if n_cols == 1:
        axes = [axes]
    
    # Hiển thị query
    if isinstance(query, np.ndarray):
        query_img = query
    else:
        query_img = np.array(Image.open(query).convert('L'))
    
    axes[0].imshow(query_img, cmap='gray')
    axes[0].set_title('QUERY', fontsize=12, fontweight='bold', color='blue')
    axes[0].axis('off')
    
    # Hiển thị kết quả
    for i, (img_path, dist, sim) in enumerate(results_to_show):
        ax = axes[i + 1]
        
        if isinstance(img_path, np.ndarray):
            img = img_path
        else:
            img = np.array(Image.open(img_path).convert('L'))
        
        ax.imshow(img, cmap='gray')
        
        # Tên file (rút gọn)
        name = Path(img_path).name if isinstance(img_path, (str, Path)) else f"Image {i+1}"
        if len(name) > 15:
            name = name[:12] + "..."
        
        # Màu title theo độ tương tự
        if sim > 0.8:
            color = 'green'
        elif sim > 0.6:
            color = 'orange'
        else:
            color = 'red'
        
        ax.set_title(f"#{i+1}: {name}\nDist={dist}, Sim={sim:.2%}", 
                     fontsize=10, color=color)
        ax.axis('off')
    
    plt.suptitle('Image Retrieval Results', fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"[OK] Đã lưu kết quả retrieval: {save_path}")
    
    plt.show()


def interactive_retrieval_demo(
    gallery: Dict[str, Dict[str, Any]],
    query_options: List[str],
    top_k: int = 5,
    config: Optional[WaveletHashConfig] = None
) -> None:
    """
    Demo tương tác cho image retrieval.
    
    Parameters
    ----------
    gallery : dict
        Gallery hash.
    query_options : list of str
        Danh sách đường dẫn ảnh query.
    top_k : int
        Số lượng kết quả.
    config : WaveletHashConfig, optional
        Cấu hình hash.
    """
    print("\n" + "="*60)
    print("IMAGE RETRIEVAL DEMO")
    print("="*60)
    print(f"Gallery size: {len(gallery)} images")
    print(f"Top-k: {top_k}")
    print()
    
    for i, query_path in enumerate(query_options):
        print(f"\n--- Query {i+1}: {Path(query_path).name} ---")
        
        results = retrieve_similar_images(
            query_path, gallery, top_k=top_k, config=config
        )
        
        print(f"Top {len(results)} similar images:")
        for rank, (img_path, dist, sim) in enumerate(results, 1):
            name = Path(img_path).name
            print(f"  {rank}. {name[:30]:30s} | Distance: {dist:3d} | Similarity: {sim:.2%}")


def evaluate_retrieval_performance(
    gallery: Dict[str, Dict[str, Any]],
    query_labels: Dict[str, int],
    gallery_labels: Dict[str, int],
    top_k_values: List[int] = [1, 3, 5, 10],
    config: Optional[WaveletHashConfig] = None
) -> Dict[str, Any]:
    """
    Đánh giá hiệu suất retrieval với nhiều giá trị top-k.
    
    Parameters
    ----------
    gallery : dict
        Gallery hash.
    query_labels : dict
        {query_path: class_label}
    gallery_labels : dict
        {gallery_path: class_label}
    top_k_values : list of int
        Các giá trị k cần đánh giá.
    config : WaveletHashConfig, optional
        Cấu hình hash.
        
    Returns
    -------
    dict
        Dictionary chứa các metrics: precision@k, recall@k cho mỗi k.
    """
    results = {f"P@{k}": [] for k in top_k_values}
    
    for query_path, query_class in query_labels.items():
        # Tìm kiếm
        search_results = retrieve_similar_images(
            query_path, gallery, top_k=max(top_k_values), config=config
        )
        
        for k in top_k_values:
            top_k_results = search_results[:k]
            
            # Đếm số lượng relevant (cùng class)
            relevant = sum(
                1 for path, _, _ in top_k_results
                if gallery_labels.get(path) == query_class
            )
            
            precision_at_k = relevant / k if k > 0 else 0
            results[f"P@{k}"].append(precision_at_k)
    
    # Tính trung bình
    final_results = {}
    for key, values in results.items():
        final_results[key] = np.mean(values) if values else 0.0
    
    return final_results
