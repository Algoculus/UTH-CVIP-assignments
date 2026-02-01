"""
Lab 4 - Wavelet Image Similarity
================================
Module hỗ trợ cho bài thực hành 4: So sánh sự tương đồng của các hình ảnh sử dụng Wavelet.
"""

from .preprocessing import load_and_preprocess, create_image_pairs_from_folder, generate_synthetic_pairs
from .wavelet_hash import dwt2, get_feature_vector, quantize_to_bits, wavelet_hash, WaveletHashConfig
from .metrics import hamming_distance, calculate_metrics, find_optimal_threshold, compute_roc_auc
from .retrieval import build_hash_gallery, retrieve_similar_images, display_retrieval_results

__all__ = [
    # Preprocessing
    'load_and_preprocess',
    'create_image_pairs_from_folder', 
    'generate_synthetic_pairs',
    # Wavelet Hash
    'dwt2',
    'get_feature_vector',
    'quantize_to_bits',
    'wavelet_hash',
    'WaveletHashConfig',
    # Metrics
    'hamming_distance',
    'calculate_metrics',
    'find_optimal_threshold',
    'compute_roc_auc',
    # Retrieval
    'build_hash_gallery',
    'retrieve_similar_images',
    'display_retrieval_results',
]
