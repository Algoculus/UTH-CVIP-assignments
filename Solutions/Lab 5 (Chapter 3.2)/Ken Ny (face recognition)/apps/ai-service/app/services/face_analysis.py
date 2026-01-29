"""
Face Analysis Service using DeepFace and custom implementations
Provides age estimation, gender detection, face attributes, and quality assessment
"""

import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
from ..services.face_detection import FaceDetectionService
from ..services.face_recognition import FaceRecognitionService

class FaceAnalysisService:
    """
    Service for comprehensive face analysis including:
    - Age estimation
    - Gender detection
    - Face attributes (glasses, beard, hat, etc.)
    - Face quality assessment
    """
    
    def __init__(self):
        self.face_detector = FaceDetectionService()
        self.face_recognizer = FaceRecognitionService()
        self.deepface_available = False
        
        # Try to initialize DeepFace
        try:
            from deepface import DeepFace
            self.deepface = DeepFace
            self.deepface_available = True
            print("✓ DeepFace initialized successfully for face analysis")
        except Exception as e:
            print(f"⚠️  DeepFace not available: {str(e)}. Some features will be limited.")
            self.deepface_available = False
    
    def analyze_age(self, face_image: np.ndarray) -> Dict:
        """
        Estimate age from face image using DeepFace.
        
        Returns:
            {
                'age': int,
                'age_confidence': float,
                'method': str
            }
        """
        if not self.deepface_available:
            # Fallback: simple heuristic based on face features
            return self._estimate_age_heuristic(face_image)
        
        try:
            # Convert BGR to RGB for DeepFace
            if len(face_image.shape) == 3:
                rgb_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = face_image
            
            # DeepFace age analysis
            result = self.deepface.analyze(
                rgb_image,
                actions=['age'],
                enforce_detection=False,
                silent=True
            )
            
            # Handle both single dict and list responses
            if isinstance(result, list):
                result = result[0]
            
            age = int(result.get('age', 0))
            
            return {
                'age': age,
                'age_confidence': 0.85,  # DeepFace doesn't provide confidence, use default
                'method': 'deepface'
            }
        except Exception as e:
            print(f"⚠️  DeepFace age analysis failed: {str(e)}. Using heuristic.")
            return self._estimate_age_heuristic(face_image)
    
    def analyze_gender(self, face_image: np.ndarray) -> Dict:
        """
        Detect gender from face image using DeepFace.
        
        Returns:
            {
                'gender': str ('Male' or 'Female'),
                'gender_confidence': float,
                'method': str
            }
        """
        if not self.deepface_available:
            # Fallback: simple heuristic
            return self._detect_gender_heuristic(face_image)
        
        try:
            # Convert BGR to RGB for DeepFace
            if len(face_image.shape) == 3:
                rgb_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = face_image
            
            result = self.deepface.analyze(
                rgb_image,
                actions=['gender'],
                enforce_detection=False,
                silent=True
            )
            
            if isinstance(result, list):
                result = result[0]
            
            gender = result.get('dominant_gender', 'Unknown')
            # DeepFace returns 'Man' or 'Woman', normalize to 'Male'/'Female'
            if gender == 'Man':
                gender = 'Male'
            elif gender == 'Woman':
                gender = 'Female'
            
            # Get confidence from gender distribution
            # DeepFace returns gender as a dict with 'Man' and 'Woman' keys with probability values
            gender_dict = result.get('gender', {})
            if isinstance(gender_dict, dict):
                # Get the probability for the detected gender
                if gender == 'Male':
                    confidence = gender_dict.get('Man', 0)
                elif gender == 'Female':
                    confidence = gender_dict.get('Woman', 0)
                else:
                    # Fallback: use max of both
                    confidence = max(gender_dict.get('Man', 0), gender_dict.get('Woman', 0))
                
                # DeepFace may return values in different formats:
                # - As probabilities (0-1): use directly
                # - As percentages (0-100): divide by 100
                # - As raw scores: normalize
                if confidence > 100:
                    # Very large number, likely a raw score, use default
                    confidence = 0.85
                elif confidence > 1.0:
                    # Percentage format, convert to decimal
                    confidence = confidence / 100.0
                elif confidence > 0 and confidence <= 1.0:
                    # Already in 0-1 range, use as is
                    pass
                else:
                    # Invalid value, use default
                    confidence = 0.85
                
                # Ensure confidence is between 0 and 1
                confidence = min(1.0, max(0.0, confidence))
            else:
                confidence = 0.85
            
            return {
                'gender': gender,
                'gender_confidence': float(confidence),
                'method': 'deepface'
            }
        except Exception as e:
            print(f"⚠️  DeepFace gender detection failed: {str(e)}. Using heuristic.")
            return self._detect_gender_heuristic(face_image)
    
    def analyze_attributes(self, face_image: np.ndarray) -> Dict:
        """
        Detect face attributes (glasses, beard, hat, mustache, etc.) using DeepFace.
        
        Returns:
            {
                'glasses': bool,
                'beard': bool,
                'hat': bool,
                'mustache': bool,
                'method': str
            }
        """
        if not self.deepface_available:
            return {
                'glasses': False,
                'beard': False,
                'hat': False,
                'mustache': False,
                'method': 'heuristic'
            }
        
        try:
            result = self.deepface.analyze(
                face_image,
                actions=['race'],  # DeepFace doesn't have direct attribute detection
                enforce_detection=False,
                silent=True
            )
            
            if isinstance(result, list):
                result = result[0]
            
            # DeepFace doesn't directly provide these attributes
            # We'll use a heuristic approach based on face regions
            attributes = self._detect_attributes_heuristic(face_image)
            attributes['method'] = 'heuristic'
            
            return attributes
        except Exception as e:
            print(f"⚠️  Attribute detection failed: {str(e)}. Using heuristic.")
            return self._detect_attributes_heuristic(face_image)
    
    def _estimate_age_heuristic(self, face_image: np.ndarray) -> Dict:
        """Simple heuristic age estimation based on face features."""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY) if len(face_image.shape) == 3 else face_image
        gray = cv2.resize(gray, (200, 200))
        
        # Analyze skin texture (wrinkles increase with age)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # Analyze face shape (faces become longer with age)
        h, w = gray.shape
        aspect_ratio = h / w
        
        # Simple scoring (very rough estimate)
        # More edges + longer face = older
        age_score = (edge_density * 100) + (aspect_ratio - 1.2) * 20
        
        # Map to age range
        estimated_age = int(20 + age_score * 0.5)
        estimated_age = max(18, min(80, estimated_age))  # Clamp to reasonable range
        
        return {
            'age': estimated_age,
            'age_confidence': 0.5,  # Low confidence for heuristic
            'method': 'heuristic'
        }
    
    def _detect_gender_heuristic(self, face_image: np.ndarray) -> Dict:
        """Simple heuristic gender detection based on face features."""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY) if len(face_image.shape) == 3 else face_image
        gray = cv2.resize(gray, (200, 200))
        h, w = gray.shape
        
        # Analyze jawline (typically wider in males)
        jaw_region = gray[int(h * 0.6):, :]
        jaw_width = np.std(jaw_region)
        
        # Analyze eyebrow region (typically thicker in males)
        eyebrow_region = gray[int(h * 0.2):int(h * 0.35), :]
        eyebrow_intensity = np.mean(eyebrow_region)
        
        # Simple scoring
        male_score = (jaw_width / 10) + (eyebrow_intensity / 255)
        
        gender = 'Male' if male_score > 0.3 else 'Female'
        confidence = min(0.7, abs(male_score - 0.3) * 2)
        
        return {
            'gender': gender,
            'gender_confidence': float(confidence),
            'method': 'heuristic'
        }
    
    def _detect_attributes_heuristic(self, face_image: np.ndarray) -> Dict:
        """Detect face attributes using computer vision heuristics."""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY) if len(face_image.shape) == 3 else face_image
        gray = cv2.resize(gray, (200, 200))
        h, w = gray.shape
        
        # Detect glasses (bright horizontal lines in eye region)
        eye_region = gray[int(h * 0.25):int(h * 0.45), :]
        edges = cv2.Canny(eye_region, 30, 100)
        horizontal_edges = np.sum(edges[int(edges.shape[0] * 0.3):int(edges.shape[0] * 0.7), :] > 0)
        has_glasses = horizontal_edges > (eye_region.size * 0.05)
        
        # Detect hat (dark region at top of head)
        top_region = gray[:int(h * 0.2), :]
        top_brightness = np.mean(top_region)
        has_hat = top_brightness < 100  # Dark top region suggests hat
        
        # Detect beard (textured region in lower face)
        lower_face = gray[int(h * 0.6):, :]
        lower_std = np.std(lower_face)
        has_beard = lower_std > 25  # High variation suggests beard texture
        
        # Detect mustache (similar to beard but higher up)
        mustache_region = gray[int(h * 0.5):int(h * 0.65), :]
        mustache_std = np.std(mustache_region)
        has_mustache = mustache_std > 20 and not has_beard
        
        return {
            'glasses': bool(has_glasses),
            'beard': bool(has_beard),
            'hat': bool(has_hat),
            'mustache': bool(has_mustache)
        }
    
    def analyze_comprehensive(self, face_image: np.ndarray, modes: List[str] = None) -> Dict:
        """
        Perform comprehensive face analysis.
        
        Args:
            face_image: Face image as numpy array
            modes: List of analysis modes ['age', 'gender', 'attributes', 'quality']
        
        Returns:
            Dictionary with all analysis results
        """
        if modes is None:
            modes = ['age', 'gender', 'attributes', 'quality']
        
        result = {
            'modes_analyzed': modes
        }
        
        if 'age' in modes:
            result['age_analysis'] = self.analyze_age(face_image)
        
        if 'gender' in modes:
            result['gender_analysis'] = self.analyze_gender(face_image)
        
        if 'attributes' in modes:
            result['attributes'] = self.analyze_attributes(face_image)
        
        # Quality assessment is handled separately by FaceQualityService
        # but we include a note here
        if 'quality' in modes:
            result['quality_note'] = 'Quality assessment available via FaceQualityService'
        
        return result
