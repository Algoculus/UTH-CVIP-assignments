import cv2
import numpy as np
import os

class EmotionRecognitionService:
    """
    Service for emotion recognition from facial images.
    Detects emotions: Happy, Sad, Angry, Surprise, Fear, Disgust, Neutral
    Uses DeepFace library for accurate emotion detection.
    """
    
    def __init__(self):
        # Emotion labels in Vietnamese and English
        self.emotion_labels = {
            'angry': {'en': 'Angry', 'vi': 'Giận dữ', 'mood': 'negative'},
            'disgust': {'en': 'Disgust', 'vi': 'Ghê tởm', 'mood': 'negative'},
            'fear': {'en': 'Fear', 'vi': 'Sợ hãi', 'mood': 'negative'},
            'happy': {'en': 'Happy', 'vi': 'Vui vẻ', 'mood': 'positive'},
            'sad': {'en': 'Sad', 'vi': 'Buồn', 'mood': 'negative'},
            'surprise': {'en': 'Surprise', 'vi': 'Ngạc nhiên', 'mood': 'neutral'},
            'neutral': {'en': 'Neutral', 'vi': 'Bình thường', 'mood': 'neutral'}
        }
        
        # Try to use DeepFace for better accuracy
        self.use_deepface = False
        self._init_deepface()
    
    def _init_deepface(self):
        """
        Initialize DeepFace library for emotion recognition.
        Falls back to heuristic if DeepFace is not available.
        """
        try:
            from deepface import DeepFace
            self.deepface = DeepFace
            self.use_deepface = True
            print("✓ DeepFace initialized successfully for emotion recognition")
        except ImportError:
            print("⚠️  DeepFace not installed. Install with: pip install deepface")
            print("⚠️  Falling back to heuristic approach (less accurate)")
            self.use_deepface = False
        except Exception as e:
            print(f"⚠️  Could not initialize DeepFace: {str(e)}")
            print("⚠️  Falling back to heuristic approach")
            self.use_deepface = False
    
    def analyze_emotion(self, face_image: np.ndarray):
        """
        Analyze emotion from a cropped face image.
        
        Args:
            face_image: numpy array of face image (BGR format)
            
        Returns:
            dict with emotion analysis results
        """
        if self.use_deepface:
            return self._analyze_with_deepface(face_image)
        else:
            return self._analyze_heuristic(face_image)
    
    def _analyze_with_deepface(self, face_image: np.ndarray):
        """Analyze emotion using DeepFace library."""
        try:
            # Ensure image has minimum size
            if face_image.shape[0] < 48 or face_image.shape[1] < 48:
                # Resize to minimum size
                face_image = cv2.resize(face_image, (48, 48))
            
            # Convert BGR to RGB (DeepFace expects RGB)
            rgb_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            
            # Analyze emotion using DeepFace
            result = self.deepface.analyze(
                rgb_image,
                actions=['emotion'],
                enforce_detection=False,  # Don't fail if face not detected again
                detector_backend='skip',  # Skip face detection as we already have cropped face
                silent=True
            )
            
            # Handle both list and dict return types
            if isinstance(result, list):
                result = result[0]
            
            # Get emotion predictions
            emotion_scores = result.get('emotion', {})
            dominant_emotion = result.get('dominant_emotion', 'neutral').lower()
            
            # Create emotions list
            emotions = []
            for emotion_key in self.emotion_labels.keys():
                # DeepFace uses different naming, map them
                deepface_key = emotion_key
                if emotion_key in emotion_scores:
                    confidence = emotion_scores[emotion_key] / 100.0  # Convert percentage to 0-1
                else:
                    confidence = 0.0
                
                emotions.append({
                    'emotion': emotion_key,
                    'emotion_en': self.emotion_labels[emotion_key]['en'],
                    'emotion_vi': self.emotion_labels[emotion_key]['vi'],
                    'confidence': float(confidence),
                    'mood': self.emotion_labels[emotion_key]['mood']
                })
            
            # Sort by confidence
            emotions.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Get dominant emotion info
            dominant = emotions[0]
            
            return {
                'dominant_emotion': dominant['emotion'],
                'dominant_emotion_en': dominant['emotion_en'],
                'dominant_emotion_vi': dominant['emotion_vi'],
                'confidence': dominant['confidence'],
                'mood': dominant['mood'],
                'all_emotions': emotions,
                'mood_score': self._calculate_mood_score(emotions),
                'method': 'deepface'
            }
            
        except Exception as e:
            print(f"Error in DeepFace emotion analysis: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to heuristic
            return self._analyze_heuristic(face_image)
    
    def _analyze_heuristic(self, face_image: np.ndarray):
        """
        Analyze emotion using improved heuristic approach based on facial features.
        This uses computer vision techniques to estimate emotions.
        For production accuracy, install DeepFace: pip install deepface tf-keras
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
            
            # Resize to standard size for consistent analysis
            gray = cv2.resize(gray, (200, 200))
            height, width = gray.shape
            
            # Apply histogram equalization for better contrast
            gray = cv2.equalizeHist(gray)
            
            # Calculate regions
            # Eyes region (top 40%)
            eyes_region = gray[:int(height * 0.4), :]
            # Mouth region (bottom 30%)
            mouth_region = gray[int(height * 0.7):, :]
            # Mid face (40-70%)
            mid_face = gray[int(height * 0.4):int(height * 0.7), :]
            
            # Feature extraction
            # 1. Brightness analysis
            eyes_brightness = np.mean(eyes_region)
            mouth_brightness = np.mean(mouth_region)
            overall_brightness = np.mean(gray)
            
            # 2. Contrast analysis
            eyes_std = np.std(eyes_region)
            mouth_std = np.std(mouth_region)
            
            # 3. Edge detection for expression intensity
            edges = cv2.Canny(gray, 50, 150)
            mouth_edges = edges[int(height * 0.7):, :]
            eyes_edges = edges[:int(height * 0.4), :]
            
            mouth_edge_density = np.sum(mouth_edges > 0) / mouth_edges.size if mouth_edges.size > 0 else 0
            eyes_edge_density = np.sum(eyes_edges > 0) / eyes_edges.size if eyes_edges.size > 0 else 0
            overall_edge_density = np.sum(edges > 0) / edges.size
            
            # 4. Gradient analysis (horizontal for mouth smile/frown)
            mouth_gradient_x = cv2.Sobel(mouth_region, cv2.CV_64F, 1, 0, ksize=3)
            mouth_curvature = np.mean(np.abs(mouth_gradient_x))
            
            # Initialize emotion scores with balanced baseline
            emotion_scores = {
                'happy': 0.25,      # Start with slight positive bias
                'sad': 0.10,
                'angry': 0.10,
                'surprise': 0.15,
                'fear': 0.10,
                'disgust': 0.05,
                'neutral': 0.25     # Neutral as common baseline
            }
            
            # HAPPY detection - IMPROVED with more weight
            # - Brighter mouth area (smile)
            # - Higher mouth edge density (smile curves)
            # - High mouth curvature
            if mouth_brightness > overall_brightness + 3:  # More sensitive
                emotion_scores['happy'] += 0.4
                emotion_scores['sad'] -= 0.2  # Reduce sad when mouth is bright
            if mouth_edge_density > 0.12:  # Lower threshold
                emotion_scores['happy'] += 0.35
            if mouth_curvature > 12:  # Lower threshold
                emotion_scores['happy'] += 0.3
            if eyes_std > 20:  # Squinting eyes when smiling
                emotion_scores['happy'] += 0.2
            
            # Boost happy if multiple indicators
            happy_indicators = 0
            if mouth_brightness > overall_brightness:
                happy_indicators += 1
            if mouth_edge_density > 0.1:
                happy_indicators += 1
            if mouth_curvature > 10:
                happy_indicators += 1
            
            if happy_indicators >= 2:
                emotion_scores['happy'] += 0.3
            
            # SAD detection - MORE STRICT
            # - Darker mouth area (frown)
            # - Low overall brightness
            # - Low mouth curvature
            if mouth_brightness < overall_brightness - 8:  # More strict
                emotion_scores['sad'] += 0.2
            else:
                emotion_scores['sad'] -= 0.1
                
            if mouth_curvature < 6:  # Very low curvature
                emotion_scores['sad'] += 0.15
            if overall_brightness < 90:  # Very dark
                emotion_scores['sad'] += 0.15
            if mouth_edge_density < 0.06:  # Very low
                emotion_scores['sad'] += 0.1
                
            # Reduce sad if indicators suggest otherwise
            if mouth_brightness >= overall_brightness:
                emotion_scores['sad'] *= 0.5
            
            # ANGRY detection - MORE STRICT
            # - High eyes edge density (furrowed brow)
            # - High contrast in mid face
            # - Tense mouth
            if eyes_edge_density > 0.2:  # Higher threshold
                emotion_scores['angry'] += 0.25
            else:
                emotion_scores['angry'] -= 0.05
                
            if np.std(mid_face) > 40:  # Higher threshold
                emotion_scores['angry'] += 0.2
            if mouth_std > 35:  # Higher threshold
                emotion_scores['angry'] += 0.15
                
            # Reduce angry if mouth is bright (usually not angry when smiling)
            if mouth_brightness > overall_brightness:
                emotion_scores['angry'] *= 0.3
            
            # SURPRISE detection
            # - Very high overall edge density (wide eyes, open mouth)
            # - High eyes brightness (wide eyes)
            # - High mouth edge density
            if overall_edge_density > 0.18:
                emotion_scores['surprise'] += 0.3
            if eyes_brightness > overall_brightness + 10:
                emotion_scores['surprise'] += 0.25
            if mouth_edge_density > 0.18:
                emotion_scores['surprise'] += 0.2
            
            # FEAR detection - MORE STRICT
            # - High eyes edge density (wide eyes)
            # - Medium overall edge density
            # - Lower mouth brightness
            if eyes_edge_density > 0.16 and eyes_edge_density < 0.22:
                emotion_scores['fear'] += 0.2
            else:
                emotion_scores['fear'] -= 0.05
                
            if mouth_brightness < overall_brightness - 3:
                emotion_scores['fear'] += 0.15
            if eyes_std > 32:
                emotion_scores['fear'] += 0.15
            
            # DISGUST detection - MORE STRICT
            # - Wrinkled nose area (mid face high contrast)
            # - Mouth region asymmetry
            if np.std(mid_face) > 42:  # Higher threshold
                emotion_scores['disgust'] += 0.25
            else:
                emotion_scores['disgust'] -= 0.03
                
            if mouth_edge_density > 0.13 and mouth_edge_density < 0.17:
                emotion_scores['disgust'] += 0.15
            
            # NEUTRAL boost
            # If no strong specific signals, boost neutral
            max_emotion_score = max([v for k, v in emotion_scores.items() if k != 'neutral'])
            if max_emotion_score < 0.5:
                emotion_scores['neutral'] += 0.3
            
            # Boost neutral if face is relaxed (low edge density, moderate brightness)
            if overall_edge_density < 0.12 and 100 < overall_brightness < 180:
                emotion_scores['neutral'] += 0.2
            
            # Normalize scores to probabilities
            total_score = sum(emotion_scores.values())
            if total_score > 0:
                for key in emotion_scores:
                    emotion_scores[key] = emotion_scores[key] / total_score
            
            # Create emotions list
            emotions = []
            for emotion_key, confidence in emotion_scores.items():
                emotions.append({
                    'emotion': emotion_key,
                    'emotion_en': self.emotion_labels[emotion_key]['en'],
                    'emotion_vi': self.emotion_labels[emotion_key]['vi'],
                    'confidence': float(confidence),
                    'mood': self.emotion_labels[emotion_key]['mood']
                })
            
            # Sort by confidence
            emotions.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Get dominant emotion
            dominant = emotions[0]
            
            return {
                'dominant_emotion': dominant['emotion'],
                'dominant_emotion_en': dominant['emotion_en'],
                'dominant_emotion_vi': dominant['emotion_vi'],
                'confidence': dominant['confidence'],
                'mood': dominant['mood'],
                'all_emotions': emotions,
                'mood_score': self._calculate_mood_score(emotions),
                'method': 'heuristic',
                'note': '⚠️ Using basic heuristic approach. For 2-3x better accuracy, install DeepFace: pip install deepface tf-keras'
            }
            
        except Exception as e:
            print(f"Error in heuristic emotion analysis: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return default neutral emotion
            return {
                'dominant_emotion': 'neutral',
                'dominant_emotion_en': 'Neutral',
                'dominant_emotion_vi': 'Bình thường',
                'confidence': 0.6,
                'mood': 'neutral',
                'all_emotions': [{
                    'emotion': 'neutral',
                    'emotion_en': 'Neutral',
                    'emotion_vi': 'Bình thường',
                    'confidence': 0.6,
                    'mood': 'neutral'
                }],
                'mood_score': 0.0,
                'method': 'fallback',
                'error': str(e)
            }
    
    def _calculate_mood_score(self, emotions: list):
        """
        Calculate overall mood score from -1 (very negative) to +1 (very positive)
        
        Args:
            emotions: list of emotion predictions with confidence
            
        Returns:
            float: mood score between -1 and 1
        """
        mood_score = 0.0
        total_confidence = 0.0
        
        for emotion in emotions:
            confidence = emotion['confidence']
            mood = emotion['mood']
            
            if mood == 'positive':
                mood_score += confidence
            elif mood == 'negative':
                mood_score -= confidence
            # neutral emotions don't affect the score
            
            total_confidence += confidence
        
        # Normalize by total confidence
        if total_confidence > 0:
            mood_score = mood_score / total_confidence
        
        # Clamp between -1 and 1
        mood_score = max(-1.0, min(1.0, mood_score))
        
        return float(mood_score)
    
    def get_mood_description(self, mood_score: float, language: str = 'vi'):
        """
        Get textual description of mood based on mood score.
        
        Args:
            mood_score: score between -1 and 1
            language: 'vi' or 'en'
            
        Returns:
            str: mood description
        """
        descriptions = {
            'vi': {
                'very_positive': 'Tâm trạng rất tích cực, vui vẻ',
                'positive': 'Tâm trạng tích cực',
                'slightly_positive': 'Tâm trạng khá tốt',
                'neutral': 'Tâm trạng bình thường',
                'slightly_negative': 'Tâm trạng hơi tiêu cực',
                'negative': 'Tâm trạng tiêu cực',
                'very_negative': 'Tâm trạng rất tiêu cực'
            },
            'en': {
                'very_positive': 'Very positive mood, happy',
                'positive': 'Positive mood',
                'slightly_positive': 'Slightly positive mood',
                'neutral': 'Neutral mood',
                'slightly_negative': 'Slightly negative mood',
                'negative': 'Negative mood',
                'very_negative': 'Very negative mood'
            }
        }
        
        lang_desc = descriptions.get(language, descriptions['vi'])
        
        if mood_score > 0.5:
            return lang_desc['very_positive']
        elif mood_score > 0.2:
            return lang_desc['positive']
        elif mood_score > 0.0:
            return lang_desc['slightly_positive']
        elif mood_score > -0.2:
            return lang_desc['neutral']
        elif mood_score > -0.5:
            return lang_desc['slightly_negative']
        elif mood_score > -0.7:
            return lang_desc['negative']
        else:
            return lang_desc['very_negative']
