"""
Face Quality Assessment Service
Evaluates face image quality: blur, brightness, contrast, angle, symmetry, etc.
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple
from ..services.face_detection import FaceDetectionService

class FaceQualityService:
    """
    Service for assessing face image quality.
    Provides metrics for blur, brightness, contrast, face angle, symmetry, etc.
    """
    
    def __init__(self):
        self.face_detector = FaceDetectionService()
    
    def assess_quality(self, face_image: np.ndarray, face_box: List[int] = None, 
                      keypoints: Dict = None) -> Dict:
        """
        Comprehensive face quality assessment.
        
        Args:
            face_image: Face image as numpy array
            face_box: Optional bounding box [x, y, w, h]
            keypoints: Optional face landmarks from MTCNN
        
        Returns:
            Dictionary with quality metrics and recommendations
        """
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY) if len(face_image.shape) == 3 else face_image
        
        # Calculate individual metrics
        blur_score = self._assess_blur(gray)
        brightness = self._assess_brightness(gray)
        contrast = self._assess_contrast(gray)
        face_angle = self._assess_face_angle(keypoints) if keypoints else 0.0
        symmetry = self._assess_symmetry(gray, keypoints) if keypoints else 0.5
        face_size_score = self._assess_face_size(face_image, face_box) if face_box else 0.5
        occlusion = self._assess_occlusion(keypoints) if keypoints else False
        
        # Calculate overall quality score (weighted average)
        overall_score = (
            blur_score * 0.25 +
            brightness * 0.15 +
            contrast * 0.15 +
            (1 - abs(face_angle) / 45) * 0.15 +  # Normalize angle (0-45 degrees)
            symmetry * 0.15 +
            face_size_score * 0.10 +
            (0.8 if not occlusion else 0.3) * 0.05
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            blur_score, brightness, contrast, face_angle, symmetry, face_size_score, occlusion
        )
        
        return {
            'overall_score': float(overall_score),
            'blur_score': float(blur_score),
            'brightness': float(brightness),
            'contrast': float(contrast),
            'angle': float(face_angle),
            'symmetry': float(symmetry),
            'face_size_score': float(face_size_score),
            'occlusion_detected': bool(occlusion),
            'recommendations': recommendations,
            'quality_level': self._get_quality_level(overall_score)
        }
    
    def _assess_blur(self, gray_image: np.ndarray) -> float:
        """
        Assess image blur using Laplacian variance.
        Higher variance = sharper image.
        
        Returns:
            Score from 0.0 (very blurry) to 1.0 (very sharp)
        """
        laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)
        variance = laplacian.var()
        
        # Normalize: typical sharp images have variance > 100
        # Very blurry: < 50, Sharp: > 200
        if variance < 50:
            score = variance / 50.0
        elif variance > 200:
            score = 1.0
        else:
            score = 0.5 + (variance - 50) / 300.0
        
        return min(1.0, max(0.0, score))
    
    def _assess_brightness(self, gray_image: np.ndarray) -> float:
        """
        Assess image brightness.
        Optimal range: 100-180 (out of 255)
        
        Returns:
            Score from 0.0 (too dark/bright) to 1.0 (optimal)
        """
        mean_brightness = np.mean(gray_image)
        
        # Optimal range: 100-180
        if 100 <= mean_brightness <= 180:
            score = 1.0
        elif mean_brightness < 100:
            # Too dark: linear decrease
            score = mean_brightness / 100.0
        else:
            # Too bright: linear decrease
            score = 1.0 - (mean_brightness - 180) / 75.0
        
        return min(1.0, max(0.0, score))
    
    def _assess_contrast(self, gray_image: np.ndarray) -> float:
        """
        Assess image contrast using standard deviation.
        Higher std = more contrast.
        
        Returns:
            Score from 0.0 (low contrast) to 1.0 (high contrast)
        """
        std = np.std(gray_image)
        
        # Good contrast: std > 30
        # Low contrast: std < 15
        if std < 15:
            score = std / 15.0
        elif std > 50:
            score = 1.0
        else:
            score = 0.5 + (std - 15) / 70.0
        
        return min(1.0, max(0.0, score))
    
    def _assess_face_angle(self, keypoints: Dict) -> float:
        """
        Estimate face rotation angle from landmarks.
        
        Args:
            keypoints: Face landmarks from MTCNN
                Expected keys: 'left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right'
        
        Returns:
            Angle in degrees (positive = right tilt, negative = left tilt)
        """
        if not keypoints or 'left_eye' not in keypoints or 'right_eye' not in keypoints:
            return 0.0
        
        left_eye = keypoints['left_eye']
        right_eye = keypoints['right_eye']
        
        # Calculate angle from eye positions
        dy = right_eye[1] - left_eye[1]
        dx = right_eye[0] - left_eye[0]
        
        if dx == 0:
            return 90.0 if dy > 0 else -90.0
        
        angle_rad = np.arctan2(dy, dx)
        angle_deg = np.degrees(angle_rad)
        
        return float(angle_deg)
    
    def _assess_symmetry(self, gray_image: np.ndarray, keypoints: Dict) -> float:
        """
        Assess face symmetry by comparing left and right halves.
        
        Returns:
            Score from 0.0 (asymmetric) to 1.0 (symmetric)
        """
        try:
            h, w = gray_image.shape
            
            # Validate image dimensions
            if h == 0 or w == 0:
                return 0.5
            
            if not keypoints or 'nose' not in keypoints:
                # Fallback: simple left-right comparison
                if w < 2:
                    return 0.5
                    
                left_half = gray_image[:, :w//2]
                right_half = gray_image[:, w//2:]
                
                # Validate halves
                if left_half.size == 0 or right_half.size == 0:
                    return 0.5
                
                right_half_flipped = cv2.flip(right_half, 1)
                
                # Validate flipped result
                if right_half_flipped is None or right_half_flipped.size == 0:
                    return 0.5
                
                # Resize to same size if needed
                if left_half.shape != right_half_flipped.shape:
                    if right_half_flipped.shape[1] > 0 and right_half_flipped.shape[0] > 0:
                        right_half_flipped = cv2.resize(right_half_flipped, (left_half.shape[1], left_half.shape[0]))
                    else:
                        return 0.5
                
                # Calculate difference
                diff = np.abs(left_half.astype(float) - right_half_flipped.astype(float))
                mean_diff = np.mean(diff) / 255.0
                
                return float(1.0 - mean_diff)
            
            # Use nose as center point
            nose_x = keypoints['nose'][0]
            
            # Validate nose position
            if nose_x <= 0 or nose_x >= w:
                # Fallback to center split
                if w < 2:
                    return 0.5
                left_half = gray_image[:, :w//2]
                right_half = gray_image[:, w//2:]
                right_half_flipped = cv2.flip(right_half, 1)
                if right_half_flipped is None or right_half_flipped.size == 0:
                    return 0.5
                if left_half.shape != right_half_flipped.shape:
                    if right_half_flipped.shape[1] > 0 and right_half_flipped.shape[0] > 0:
                        right_half_flipped = cv2.resize(right_half_flipped, (left_half.shape[1], left_half.shape[0]))
                    else:
                        return 0.5
                diff = np.abs(left_half.astype(float) - right_half_flipped.astype(float))
                mean_diff = np.mean(diff) / 255.0
                return float(1.0 - mean_diff)
            
            # Split at nose position
            left_half = gray_image[:, :int(nose_x)]
            right_half = gray_image[:, int(nose_x):]
            
            # Validate halves
            if left_half.size == 0 or right_half.size == 0:
                return 0.5
            
            # Flip right half for comparison
            right_half_flipped = cv2.flip(right_half, 1)
            
            # Validate flipped result
            if right_half_flipped is None or right_half_flipped.size == 0:
                return 0.5
            
            # Resize to same size
            if left_half.shape[1] > 0 and right_half_flipped.shape[1] > 0:
                min_width = min(left_half.shape[1], right_half_flipped.shape[1])
                if min_width > 0:
                    left_half = left_half[:, :min_width]
                    right_half_flipped = right_half_flipped[:, :min_width]
                else:
                    return 0.5
            else:
                return 0.5
            
            # Calculate similarity
            diff = np.abs(left_half.astype(float) - right_half_flipped.astype(float))
            mean_diff = np.mean(diff) / 255.0
            
            return float(1.0 - mean_diff)
            
        except Exception as e:
            # Fallback to default score on any error
            print(f"[FACE-QUALITY] Error in symmetry assessment: {e}")
            return 0.5
    
    def _assess_face_size(self, face_image: np.ndarray, face_box: List[int]) -> float:
        """
        Assess if face size is appropriate in the image.
        
        Returns:
            Score from 0.0 (too small) to 1.0 (good size)
        """
        if not face_box:
            return 0.5
        
        x, y, w, h = face_box
        face_area = w * h
        
        # Get image dimensions
        if len(face_image.shape) == 3:
            img_h, img_w = face_image.shape[:2]
        else:
            img_h, img_w = face_image.shape
        
        image_area = img_w * img_h
        face_ratio = face_area / image_area if image_area > 0 else 0
        
        # Optimal: face should be 10-40% of image
        if 0.10 <= face_ratio <= 0.40:
            score = 1.0
        elif face_ratio < 0.10:
            # Too small
            score = face_ratio / 0.10
        else:
            # Too large
            score = 1.0 - (face_ratio - 0.40) / 0.30
        
        return min(1.0, max(0.0, score))
    
    def _assess_occlusion(self, keypoints: Dict) -> bool:
        """
        Detect if face is occluded (partially hidden).
        
        Returns:
            True if occlusion detected, False otherwise
        """
        if not keypoints:
            return False
        
        required_keypoints = ['left_eye', 'right_eye', 'nose', 'mouth_left', 'mouth_right']
        
        # Check if all keypoints are present
        missing_keypoints = [kp for kp in required_keypoints if kp not in keypoints]
        
        # If more than 1 keypoint is missing, likely occluded
        return len(missing_keypoints) > 1
    
    def _generate_recommendations(self, blur_score: float, brightness: float, 
                                 contrast: float, angle: float, symmetry: float,
                                 face_size_score: float, occlusion: bool) -> List[str]:
        """Generate quality improvement recommendations."""
        recommendations = []
        
        if blur_score < 0.5:
            recommendations.append("Image is blurry - use better lighting or hold camera steady")
        elif blur_score < 0.7:
            recommendations.append("Slight blur detected - try to focus better")
        
        if brightness < 0.5:
            recommendations.append("Image is too dark - increase lighting")
        elif brightness > 0.9:
            recommendations.append("Image may be overexposed - reduce lighting")
        
        if contrast < 0.5:
            recommendations.append("Low contrast - improve lighting conditions")
        
        if abs(angle) > 15:
            recommendations.append(f"Face is tilted ({angle:.1f}°) - face camera directly")
        elif abs(angle) > 5:
            recommendations.append("Slight tilt detected - adjust head position")
        
        if symmetry < 0.7:
            recommendations.append("Face asymmetry detected - face camera directly")
        
        if face_size_score < 0.5:
            recommendations.append("Face is too small in image - move closer to camera")
        elif face_size_score > 0.95:
            recommendations.append("Face is too large - move further from camera")
        
        if occlusion:
            recommendations.append("Face may be partially occluded - ensure full face is visible")
        
        if not recommendations:
            recommendations.append("Good quality image - no improvements needed")
        
        return recommendations
    
    def _get_quality_level(self, overall_score: float) -> str:
        """Get quality level description."""
        if overall_score >= 0.8:
            return "Excellent"
        elif overall_score >= 0.6:
            return "Good"
        elif overall_score >= 0.4:
            return "Fair"
        else:
            return "Poor"
