# Metrics Module - Các hàm tính toán metrics đánh giá hiệu suất thuật toán

import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from sklearn.metrics import roc_curve, auc


# Tính khoảng cách Hamming giữa 2 hash (số bit khác nhau)
def hamming_distance(hash1: np.ndarray, hash2: np.ndarray) -> int:
    if len(hash1) != len(hash2):
        raise ValueError(
            f"2 hash phải có cùng độ dài: {len(hash1)} != {len(hash2)}"
        )
    return int(np.sum(hash1 != hash2))


# Tính khoảng cách Hamming chuẩn hóa (0-1)
def normalized_hamming_distance(hash1: np.ndarray, hash2: np.ndarray) -> float:
    return hamming_distance(hash1, hash2) / len(hash1)


# Tính độ tương đồng Hamming (1 - normalized distance)
def hamming_similarity(hash1: np.ndarray, hash2: np.ndarray) -> float:
    return 1.0 - normalized_hamming_distance(hash1, hash2)


# Tính các metrics đánh giá tại một ngưỡng cụ thể
def calculate_metrics(
    distances: np.ndarray,
    labels: np.ndarray,
    threshold: float
) -> Dict[str, Any]:
    # Phân loại dựa trên ngưỡng
    predictions = (distances <= threshold).astype(int)
    
    # Tính confusion matrix
    TP = int(np.sum((predictions == 1) & (labels == 1)))
    TN = int(np.sum((predictions == 0) & (labels == 0)))
    FP = int(np.sum((predictions == 1) & (labels == 0)))
    FN = int(np.sum((predictions == 0) & (labels == 1)))
    
    total = TP + TN + FP + FN
    eps = 1e-12  # Tránh chia cho 0
    
    # Tính các metrics
    accuracy = (TP + TN) / (total + eps)
    sensitivity = TP / (TP + FN + eps)  # TPR / Recall
    specificity = TN / (TN + FP + eps)  # TNR
    precision = TP / (TP + FP + eps)  # PPV
    
    # F1 Score
    f1 = 2 * (precision * sensitivity) / (precision + sensitivity + eps)
    
    return {
        'threshold': threshold,
        'accuracy': accuracy,
        'sensitivity': sensitivity,
        'specificity': specificity,
        'precision': precision,
        'f1_score': f1,
        'TP': TP,
        'TN': TN,
        'FP': FP,
        'FN': FN,
        'predictions': predictions,
    }


# Tìm ngưỡng tối ưu theo tiêu chí được chọn
def find_optimal_threshold(
    distances: np.ndarray,
    labels: np.ndarray,
    criterion: str = "accuracy",
    num_thresholds: int = 100
) -> Dict[str, Any]:
    # Tạo danh sách ngưỡng
    min_dist = distances.min()
    max_dist = distances.max()
    thresholds = np.linspace(min_dist, max_dist, num_thresholds)
    
    best_metrics = None
    best_score = -np.inf
    all_metrics = []
    
    for thr in thresholds:
        metrics = calculate_metrics(distances, labels, thr)
        all_metrics.append(metrics)
        
        # Tính score theo tiêu chí
        if criterion == "accuracy":
            score = metrics['accuracy']
        elif criterion == "youden":
            score = metrics['sensitivity'] + metrics['specificity'] - 1
        elif criterion == "f1":
            score = metrics['f1_score']
        else:
            raise ValueError(f"Tiêu chí không hợp lệ: {criterion}")
        
        if score > best_score:
            best_score = score
            best_metrics = metrics.copy()
    
    best_metrics['criterion'] = criterion
    best_metrics['all_thresholds'] = thresholds
    best_metrics['all_metrics'] = all_metrics
    
    return best_metrics


# Tính đường cong ROC và AUC
def compute_roc_auc(
    distances: np.ndarray,
    labels: np.ndarray
) -> Dict[str, Any]:
    # Đổi dấu vì sklearn.roc_curve mong đợi score cao = positive
    scores = -distances.astype(float)
    
    fpr, tpr, thresholds = roc_curve(labels, scores)
    roc_auc = auc(fpr, tpr)
    
    # Tìm điểm tối ưu theo Youden's Index
    youden = tpr - fpr
    optimal_idx = np.argmax(youden)
    
    # Chuyển threshold về dạng distance (đổi dấu lại)
    optimal_threshold = -thresholds[optimal_idx] if optimal_idx < len(thresholds) else 0
    
    return {
        'fpr': fpr,
        'tpr': tpr,
        'thresholds': thresholds,
        'auc': roc_auc,
        'optimal_idx': optimal_idx,
        'optimal_threshold': optimal_threshold,
        'optimal_tpr': tpr[optimal_idx],
        'optimal_fpr': fpr[optimal_idx],
    }


# Đánh giá một phương pháp hash trên tập cặp ảnh
def evaluate_method_on_pairs(
    pairs: List[Tuple],
    hash_function,
    **hash_kwargs
) -> Tuple[np.ndarray, np.ndarray]:
    distances = []
    labels = []
    
    for item in pairs:
        if len(item) == 3:
            img1, img2, label = item
        elif len(item) == 4:
            img1, img2, label, _ = item  # Có description
        else:
            raise ValueError(f"Tuple không hợp lệ: {item}")
        
        h1 = hash_function(img1, **hash_kwargs)
        h2 = hash_function(img2, **hash_kwargs)
        
        # Nếu hash trả về dict, lấy hash_bits
        if isinstance(h1, dict):
            h1 = h1['hash_bits']
        if isinstance(h2, dict):
            h2 = h2['hash_bits']
        
        dist = hamming_distance(h1, h2)
        distances.append(dist)
        labels.append(label)
    
    return np.array(distances), np.array(labels)


# Format kết quả đánh giá thành bảng text
def format_metrics_table(
    results: List[Dict[str, Any]],
    metrics_to_show: List[str] = None
) -> str:
    if metrics_to_show is None:
        metrics_to_show = ['accuracy', 'sensitivity', 'specificity', 'f1_score', 'threshold']
    
    # Header
    header = "| Method | " + " | ".join([m.capitalize() for m in metrics_to_show]) + " |"
    separator = "|" + "-" * (len(header) - 2) + "|"
    
    lines = [separator, header, separator]
    
    for r in results:
        name = r.get('name', 'Unknown')
        values = []
        for m in metrics_to_show:
            if m in r:
                val = r[m]
                if isinstance(val, float):
                    values.append(f"{val:.4f}")
                else:
                    values.append(str(val))
            else:
                values.append("N/A")
        
        line = f"| {name} | " + " | ".join(values) + " |"
        lines.append(line)
    
    lines.append(separator)
    
    return "\n".join(lines)


def plot_roc_curve(
    roc_data: Dict[str, Any],
    ax=None,
    title: str = "ROC Curve",
    show_optimal: bool = True,
    save_path: Optional[str] = None
) -> None:
    # Vẽ đường cong ROC từ dữ liệu compute_roc_auc()
    import matplotlib.pyplot as plt
    
    if ax is None:
        fig, ax = plt.subplots(figsize=(8, 6))
    
    # Vẽ ROC curve
    ax.plot(
        roc_data['fpr'], roc_data['tpr'],
        color='darkorange', lw=2,
        label=f"ROC curve (AUC = {roc_data['auc']:.4f})"
    )
    
    # Đường tham chiếu (random classifier)
    ax.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random (AUC = 0.5)')
    
    # Điểm tối ưu
    if show_optimal:
        ax.plot(
            roc_data['optimal_fpr'], roc_data['optimal_tpr'],
            'ro', markersize=10,
            label=f"Optimal (TPR={roc_data['optimal_tpr']:.3f}, FPR={roc_data['optimal_fpr']:.3f})"
        )
    
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.05])
    ax.set_xlabel('False Positive Rate (1 - Specificity)')
    ax.set_ylabel('True Positive Rate (Sensitivity)')
    ax.set_title(title)
    ax.legend(loc='lower right')
    ax.grid(alpha=0.3)
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"[OK] Đã lưu ROC curve: {save_path}")


def plot_confusion_matrix(
    metrics: Dict[str, Any],
    ax=None,
    title: str = "Confusion Matrix",
    save_path: Optional[str] = None
) -> None:
    # Vẽ confusion matrix từ kết quả calculate_metrics()
    import matplotlib.pyplot as plt
    import seaborn as sns
    
    if ax is None:
        fig, ax = plt.subplots(figsize=(6, 5))
    
    cm = np.array([
        [metrics['TN'], metrics['FP']],
        [metrics['FN'], metrics['TP']]
    ])
    
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=['Dissimilar', 'Similar'],
        yticklabels=['Dissimilar', 'Similar'],
        ax=ax
    )
    
    ax.set_xlabel('Predicted')
    ax.set_ylabel('Actual')
    ax.set_title(f"{title}\n(Threshold={metrics['threshold']:.2f}, Accuracy={metrics['accuracy']:.2%})")
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"[OK] Đã lưu confusion matrix: {save_path}")
