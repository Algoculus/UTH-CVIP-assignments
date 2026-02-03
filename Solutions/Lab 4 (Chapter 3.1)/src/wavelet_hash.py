# Wavelet Hash Module - Các hàm tạo hash wavelet cho ảnh

import numpy as np
import pywt
from dataclasses import dataclass, field
from typing import Tuple, Union, Dict, Any, Optional
from pathlib import Path

from .preprocessing import load_image_array


# Cấu hình cho thuật toán Wavelet Hash
@dataclass
class WaveletHashConfig:
    wavelet: str = "haar"
    level: int = 2
    subband_mode: str = "LL"
    quant_method: str = "median"
    hash_bits: int = 256
    image_size: Tuple[int, int] = (256, 256)
    quant_kwargs: Dict[str, Any] = field(default_factory=dict)
    
    def __str__(self):
        return (
            f"WaveletHash({self.wavelet}, L{self.level}, "
            f"{self.subband_mode}, {self.quant_method}, {self.hash_bits}bits)"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "wavelet": self.wavelet,
            "level": self.level,
            "subband_mode": self.subband_mode,
            "quant_method": self.quant_method,
            "hash_bits": self.hash_bits,
            "image_size": self.image_size,
            "quant_kwargs": self.quant_kwargs,
        }


# Các cấu hình mặc định phổ biến
DEFAULT_CONFIG = WaveletHashConfig()

CONFIG_HAAR_L2_MEDIAN = WaveletHashConfig(wavelet="haar", level=2, quant_method="median")
CONFIG_DB2_L2_MEDIAN = WaveletHashConfig(wavelet="db2", level=2, quant_method="median")
CONFIG_DB4_L3_MEDIAN = WaveletHashConfig(wavelet="db4", level=3, quant_method="median")
CONFIG_SYM2_L2_MEAN = WaveletHashConfig(wavelet="sym2", level=2, quant_method="mean")


# Thực hiện phân tích Wavelet 2D đa cấp (Discrete Wavelet Transform 2D)
def dwt2(
    image_arr: np.ndarray,
    wavelet: str = "haar",
    level: int = 2
) -> list:
    return pywt.wavedec2(image_arr, wavelet=wavelet, level=level)


# Trích xuất vector đặc trưng từ các subband wavelet đã chọn
def get_feature_vector(
    coeffs: list,
    mode: str = "LL"
) -> np.ndarray:
    mode = mode.upper()
    
    # Lấy approximation ở cấp cao nhất
    cA = coeffs[0]
    
    # Lấy detail coefficients ở cấp cao nhất
    # coeffs[1] = (cH_n, cV_n, cD_n)
    cH, cV, cD = coeffs[1]
    
    def flatten_concat(*arrays):
        """Flatten và nối các mảng thành vector 1D."""
        return np.concatenate([a.flatten() for a in arrays], axis=0)
    
    if mode == "LL":
        return cA.flatten()
    
    elif mode == "LL_LH":
        return flatten_concat(cA, cH)
    
    elif mode == "LL_HL":
        return flatten_concat(cA, cV)
    
    elif mode == "LL_LH_HL":
        return flatten_concat(cA, cH, cV)
    
    elif mode == "ALL":
        return flatten_concat(cA, cH, cV, cD)
    
    else:
        raise ValueError(
            f"subband_mode không hợp lệ: '{mode}'. "
            "Chọn một trong: LL, LL_LH, LL_HL, LL_LH_HL, ALL"
        )


# Chuyển đổi vector đặc trưng (float) thành mảng bit với độ dài cố định
def quantize_to_bits(
    feature_vector: np.ndarray,
    method: str = "median",
    hash_bits: int = 256,
    **kwargs
) -> np.ndarray:
    method = method.lower()
    vec = feature_vector.astype(np.float32)
    
    if method in ["median", "mean"]:
        threshold = np.median(vec) if method == "median" else np.mean(vec)
        bits = (vec > threshold).astype(np.uint8)
    
    elif method == "ternary":
        # Robust quantization using MAD (Median Absolute Deviation)
        k = float(kwargs.get("k", 1.0))
        mid_policy = int(kwargs.get("mid_policy", 0))  # Giá trị cho vùng giữa
        
        median = np.median(vec)
        mad = np.median(np.abs(vec - median)) + 1e-12
        low_thresh = median - k * mad
        high_thresh = median + k * mad
        
        bits = np.empty_like(vec, dtype=np.uint8)
        bits[vec < low_thresh] = 0
        bits[vec > high_thresh] = 1
        bits[(vec >= low_thresh) & (vec <= high_thresh)] = mid_policy
    
    elif method == "uniform_step":
        # Quantization theo bước cố định, lấy LSB
        delta = float(kwargs.get("delta", 5.0))
        quantized = np.rint(vec / delta).astype(np.int32)
        bits = (quantized & 1).astype(np.uint8)  # LSB (bit cuối)
    
    else:
        raise ValueError(
            f"quant_method không hợp lệ: '{method}'. "
            "Chọn một trong: median, mean, ternary, uniform_step"
        )
    
    # Chuẩn hóa về độ dài cố định
    if len(bits) >= hash_bits:
        # Lấy mẫu đều
        indices = np.linspace(0, len(bits) - 1, hash_bits, dtype=int)
        return bits[indices].copy()
    else:
        # Padding với 0
        out = np.zeros(hash_bits, dtype=np.uint8)
        out[:len(bits)] = bits
        return out


# Chuyển mảng bit thành chuỗi hex
def bits_to_hex(bits: np.ndarray) -> str:
    # Padding để chia hết cho 8
    pad_len = (-len(bits)) % 8
    if pad_len:
        bits = np.concatenate([bits, np.zeros(pad_len, dtype=np.uint8)])
    
    bytes_arr = np.packbits(bits)
    return bytes_arr.tobytes().hex()


# Tính wavelet hash cho một ảnh
def wavelet_hash(
    image_input: Union[str, Path, np.ndarray],
    config: Optional[WaveletHashConfig] = None,
    **kwargs
) -> Dict[str, Any]:
    # Khởi tạo config
    if config is None:
        config = DEFAULT_CONFIG
    
    # Override từ kwargs
    wavelet = kwargs.get("wavelet", config.wavelet)
    level = kwargs.get("level", config.level)
    subband_mode = kwargs.get("subband_mode", config.subband_mode)
    quant_method = kwargs.get("quant_method", config.quant_method)
    hash_bits = kwargs.get("hash_bits", config.hash_bits)
    image_size = kwargs.get("image_size", config.image_size)
    quant_kwargs = kwargs.get("quant_kwargs", config.quant_kwargs)
    
    # Load và xử lý ảnh
    img_arr = load_image_array(image_input, size=image_size)
    
    # Phân tích wavelet
    coeffs = dwt2(img_arr, wavelet=wavelet, level=level)
    
    # Trích xuất feature vector
    feature_vec = get_feature_vector(coeffs, mode=subband_mode)
    
    # Lượng tử hóa thành bit
    hash_bits_arr = quantize_to_bits(
        feature_vec,
        method=quant_method,
        hash_bits=hash_bits,
        **quant_kwargs
    )
    
    # Chuyển sang hex
    hash_hex = bits_to_hex(hash_bits_arr)
    
    return {
        "hash_bits": hash_bits_arr,
        "hash_hex": hash_hex,
        "config": {
            "wavelet": wavelet,
            "level": level,
            "subband_mode": subband_mode,
            "quant_method": quant_method,
            "hash_bits": hash_bits,
            "image_size": image_size,
        },
        "subband_shape": coeffs[0].shape,
        "feature_vector_length": len(feature_vec),
    }


# Phiên bản đơn giản của wavelet_hash, chỉ trả về mảng bit
def wavelet_hash_simple(
    image_input: Union[str, Path, np.ndarray],
    wavelet: str = "haar",
    level: int = 2,
    quant_method: str = "median",
    hash_bits: int = 256,
    image_size: Tuple[int, int] = (256, 256)
) -> np.ndarray:
    result = wavelet_hash(
        image_input,
        wavelet=wavelet,
        level=level,
        subband_mode="LL",
        quant_method=quant_method,
        hash_bits=hash_bits,
        image_size=image_size
    )
    return result["hash_bits"]


# Hiển thị phân rã wavelet của ảnh
def visualize_wavelet_decomposition(
    image_input: Union[str, Path, np.ndarray],
    wavelet: str = "haar",
    level: int = 2,
    figsize: Tuple[int, int] = (12, 8)
) -> None:
    import matplotlib.pyplot as plt
    
    # Load ảnh
    img_arr = load_image_array(image_input, size=(512, 512))
    
    # Phân rã wavelet
    coeffs = pywt.wavedec2(img_arr, wavelet=wavelet, level=level)
    
    # Chuyển coefficients thành mảng 2D
    arr, slices = pywt.coeffs_to_array(coeffs)
    
    # Vẽ
    fig, axes = plt.subplots(1, 2, figsize=figsize)
    
    axes[0].imshow(img_arr, cmap='gray')
    axes[0].set_title('Ảnh gốc')
    axes[0].axis('off')
    
    axes[1].imshow(np.abs(arr), cmap='gray')
    axes[1].set_title(f'Wavelet Decomposition\n({wavelet}, level={level})')
    axes[1].axis('off')
    
    plt.tight_layout()
    plt.show()
