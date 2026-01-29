from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import cv2
import numpy as np
import base64
from ..services.face_detection import FaceDetectionService
from ..services.emotion_recognition import EmotionRecognitionService
from ..services.music_recommendation import MusicRecommendationService

router = APIRouter(prefix="/emotion", tags=["emotion"])

# Initialize services
face_detector = FaceDetectionService()
emotion_recognizer = EmotionRecognitionService()
music_recommender = MusicRecommendationService()

class EmotionRequest(BaseModel):
    image: str  # Base64 encoded image
    face_box: list = None  # Optional: [x, y, width, height] to analyze specific face
    language: str = 'vi'  # 'vi' or 'en' for response language

class BatchEmotionRequest(BaseModel):
    image: str  # Base64 encoded image
    language: str = 'vi'  # 'vi' or 'en' for response language

class DeepAnalysisRequest(BaseModel):
    image: str  # Base64 encoded image
    language: str = 'vi'  # 'vi' or 'en' for response language
    include_facial_features: bool = True  # Include detailed facial analysis

def decode_base64_image(image_str: str) -> np.ndarray:
    """Decode base64 image string to numpy array."""
    try:
        # Remove data URL prefix if present
        if "," in image_str:
            image_str = image_str.split(",")[1]
        
        image_bytes = base64.b64decode(image_str)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Could not decode image")
        
        return image
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

@router.post("/analyze")
async def analyze_emotion(request: EmotionRequest):
    """
    Analyze emotion from a single face in an image.
    
    If face_box is provided, analyze that specific face region.
    Otherwise, detect faces and analyze the first face found.
    """
    try:
        print(f"[EMOTION-ANALYZE] Received emotion analysis request")
        image = decode_base64_image(request.image)
        print(f"[EMOTION-ANALYZE] Image decoded: shape={image.shape}")
        
        # If face_box is provided, use it directly
        if request.face_box and len(request.face_box) == 4:
            face_box = request.face_box
            print(f"[EMOTION-ANALYZE] Using provided face_box: {face_box}")
        else:
            # Detect faces
            faces = face_detector.detect_faces(image)
            print(f"[EMOTION-ANALYZE] Detected {len(faces)} faces")
            
            if len(faces) == 0:
                print(f"[EMOTION-ANALYZE] ERROR: No faces detected")
                raise HTTPException(status_code=400, detail="No faces detected in image")
            
            if len(faces) > 1:
                print(f"[EMOTION-ANALYZE] WARNING: Multiple faces detected, analyzing first face")
            
            # Use the first face
            face_box = faces[0]['box']
            print(f"[EMOTION-ANALYZE] Face box: {face_box}")
        
        # Crop face
        face_image = face_detector.crop_face(image, face_box)
        print(f"[EMOTION-ANALYZE] Cropped face: shape={face_image.shape}")
        
        # Analyze emotion
        emotion_result = emotion_recognizer.analyze_emotion(face_image)
        print(f"[EMOTION-ANALYZE] Emotion: {emotion_result['dominant_emotion']}, confidence={emotion_result['confidence']:.2f}")
        
        # Add mood description
        mood_description = emotion_recognizer.get_mood_description(
            emotion_result['mood_score'], 
            request.language
        )
        
        return {
            "face_box": face_box,
            "emotion": emotion_result['dominant_emotion'],
            "emotion_label": emotion_result['dominant_emotion_vi'] if request.language == 'vi' else emotion_result['dominant_emotion_en'],
            "confidence": emotion_result['confidence'],
            "mood": emotion_result['mood'],
            "mood_score": emotion_result['mood_score'],
            "mood_description": mood_description,
            "all_emotions": emotion_result['all_emotions'],
            "note": emotion_result.get('note', None)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[EMOTION-ANALYZE] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-batch")
async def analyze_emotions_batch(request: BatchEmotionRequest):
    """
    Analyze emotions for all faces detected in an image.
    
    Returns emotion analysis for each detected face.
    """
    try:
        print(f"[EMOTION-BATCH] Received batch emotion analysis request")
        image = decode_base64_image(request.image)
        print(f"[EMOTION-BATCH] Image decoded: shape={image.shape}")
        
        # Detect all faces
        faces = face_detector.detect_faces(image)
        print(f"[EMOTION-BATCH] Detected {len(faces)} faces")
        
        if len(faces) == 0:
            print("[EMOTION-BATCH] No faces detected")
            return {
                "faces": [],
                "count": 0
            }
        
        results = []
        
        for idx, face in enumerate(faces):
            print(f"[EMOTION-BATCH] Processing face {idx + 1}/{len(faces)}")
            
            try:
                # Crop face
                face_image = face_detector.crop_face(image, face['box'])
                
                # Analyze emotion
                emotion_result = emotion_recognizer.analyze_emotion(face_image)
                
                # Add mood description
                mood_description = emotion_recognizer.get_mood_description(
                    emotion_result['mood_score'], 
                    request.language
                )
                
                results.append({
                    "face_box": face['box'],
                    "emotion": emotion_result['dominant_emotion'],
                    "emotion_label": emotion_result['dominant_emotion_vi'] if request.language == 'vi' else emotion_result['dominant_emotion_en'],
                    "confidence": emotion_result['confidence'],
                    "mood": emotion_result['mood'],
                    "mood_score": emotion_result['mood_score'],
                    "mood_description": mood_description,
                    "all_emotions": emotion_result['all_emotions'][:3],  # Top 3 emotions only
                })
                
                print(f"[EMOTION-BATCH] Face {idx + 1}: {emotion_result['dominant_emotion']} ({emotion_result['confidence']:.2f})")
                
            except Exception as e:
                print(f"[EMOTION-BATCH] ERROR processing face {idx + 1}: {str(e)}")
                results.append({
                    "face_box": face['box'],
                    "emotion": "unknown",
                    "emotion_label": "Không xác định" if request.language == 'vi' else "Unknown",
                    "confidence": 0.0,
                    "mood": "neutral",
                    "mood_score": 0.0,
                    "mood_description": "Không thể phân tích" if request.language == 'vi' else "Cannot analyze",
                    "error": str(e)
                })
        
        print(f"[EMOTION-BATCH] Returning {len(results)} results")
        return {
            "faces": results,
            "count": len(results)
        }
        
    except Exception as e:
        print(f"[EMOTION-BATCH] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-deep")
async def analyze_emotions_deep(request: DeepAnalysisRequest):
    """
    Deep emotion analysis with detailed facial features and insights.
    Provides comprehensive emotion breakdown and facial analysis.
    """
    try:
        print(f"[EMOTION-DEEP] Received deep emotion analysis request")
        image = decode_base64_image(request.image)
        print(f"[EMOTION-DEEP] Image decoded: shape={image.shape}")
        
        # Detect all faces
        faces = face_detector.detect_faces(image)
        print(f"[EMOTION-DEEP] Detected {len(faces)} faces")
        
        if len(faces) == 0:
            print("[EMOTION-DEEP] No faces detected")
            return {
                "faces": [],
                "count": 0,
                "analysis_type": "deep",
                "message": "Không tìm thấy khuôn mặt" if request.language == 'vi' else "No faces detected"
            }
        
        results = []
        
        for idx, face in enumerate(faces):
            print(f"[EMOTION-DEEP] Processing face {idx + 1}/{len(faces)}")
            
            try:
                # Crop face
                face_image = face_detector.crop_face(image, face['box'])
                
                # Analyze emotion
                emotion_result = emotion_recognizer.analyze_emotion(face_image)
                
                # Deep analysis - additional features
                gray_face = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
                
                # Facial quality metrics
                face_brightness = float(np.mean(gray_face))
                face_contrast = float(np.std(gray_face))
                
                # Detect edges for expression intensity
                edges = cv2.Canny(gray_face, 50, 150)
                expression_intensity = float(np.sum(edges > 0) / edges.size)
                
                # Face size and quality
                face_width, face_height = face_image.shape[1], face_image.shape[0]
                face_area = face_width * face_height
                
                # Calculate blur score (using Laplacian variance)
                blur_score = float(cv2.Laplacian(gray_face, cv2.CV_64F).var())
                is_blurry = blur_score < 100
                
                # Age/Gender estimation placeholder (would need additional models)
                # For now, we'll focus on emotion analysis
                
                # Mood description
                mood_description = emotion_recognizer.get_mood_description(
                    emotion_result['mood_score'], 
                    request.language
                )
                
                # Detailed insights
                insights = []
                
                # Expression intensity insight
                if expression_intensity > 0.2:
                    insights.append({
                        'type': 'expression',
                        'text': 'Biểu cảm rất rõ ràng và mạnh mẽ' if request.language == 'vi' 
                                else 'Very clear and strong expression',
                        'confidence': 'high'
                    })
                elif expression_intensity > 0.12:
                    insights.append({
                        'type': 'expression',
                        'text': 'Biểu cảm trung bình' if request.language == 'vi' 
                                else 'Moderate expression',
                        'confidence': 'medium'
                    })
                else:
                    insights.append({
                        'type': 'expression',
                        'text': 'Biểu cảm nhẹ hoặc khuôn mặt thư giãn' if request.language == 'vi' 
                                else 'Subtle expression or relaxed face',
                        'confidence': 'low'
                    })
                
                # Image quality insight
                if is_blurry:
                    insights.append({
                        'type': 'quality',
                        'text': 'Ảnh hơi mờ, có thể ảnh hưởng độ chính xác' if request.language == 'vi'
                                else 'Image is slightly blurry, may affect accuracy',
                        'confidence': 'warning'
                    })
                else:
                    insights.append({
                        'type': 'quality',
                        'text': 'Chất lượng ảnh tốt' if request.language == 'vi'
                                else 'Good image quality',
                        'confidence': 'good'
                    })
                
                # Lighting insight
                if face_brightness < 80:
                    insights.append({
                        'type': 'lighting',
                        'text': 'Ánh sáng yếu, nên tăng độ sáng' if request.language == 'vi'
                                else 'Low lighting, consider increasing brightness',
                        'confidence': 'warning'
                    })
                elif face_brightness > 200:
                    insights.append({
                        'type': 'lighting',
                        'text': 'Ánh sáng quá mạnh, có thể gây quá sáng' if request.language == 'vi'
                                else 'High lighting, may cause overexposure',
                        'confidence': 'warning'
                    })
                else:
                    insights.append({
                        'type': 'lighting',
                        'text': 'Ánh sáng phù hợp' if request.language == 'vi'
                                else 'Appropriate lighting',
                        'confidence': 'good'
                    })
                
                # Emotion confidence insight
                top_confidence = emotion_result['confidence']
                if top_confidence > 0.8:
                    insights.append({
                        'type': 'confidence',
                        'text': 'Rất chắc chắn về kết quả phân tích' if request.language == 'vi'
                                else 'Very confident about the analysis',
                        'confidence': 'high'
                    })
                elif top_confidence > 0.6:
                    insights.append({
                        'type': 'confidence',
                        'text': 'Độ tin cậy tốt' if request.language == 'vi'
                                else 'Good confidence level',
                        'confidence': 'medium'
                    })
                else:
                    insights.append({
                        'type': 'confidence',
                        'text': 'Biểu cảm không rõ ràng hoặc trung lập' if request.language == 'vi'
                                else 'Unclear expression or neutral',
                        'confidence': 'low'
                    })
                
                # Mood intensity
                mood_intensity = abs(emotion_result['mood_score'])
                if mood_intensity > 0.7:
                    insights.append({
                        'type': 'mood_intensity',
                        'text': 'Cảm xúc rất mạnh mẽ' if request.language == 'vi'
                                else 'Very strong emotions',
                        'confidence': 'high'
                    })
                elif mood_intensity > 0.4:
                    insights.append({
                        'type': 'mood_intensity',
                        'text': 'Cảm xúc rõ ràng' if request.language == 'vi'
                                else 'Clear emotions',
                        'confidence': 'medium'
                    })
                else:
                    insights.append({
                        'type': 'mood_intensity',
                        'text': 'Cảm xúc nhẹ nhàng hoặc trung lập' if request.language == 'vi'
                                else 'Mild or neutral emotions',
                        'confidence': 'low'
                    })
                
                # Build result
                result = {
                    "face_box": face['box'],
                    "face_index": idx + 1,
                    
                    # Basic emotion info
                    "emotion": emotion_result['dominant_emotion'],
                    "emotion_label": emotion_result['dominant_emotion_vi'] if request.language == 'vi' 
                                    else emotion_result['dominant_emotion_en'],
                    "confidence": emotion_result['confidence'],
                    "mood": emotion_result['mood'],
                    "mood_score": emotion_result['mood_score'],
                    "mood_description": mood_description,
                    
                    # All emotions with percentages
                    "all_emotions": emotion_result['all_emotions'],
                    
                    # Deep analysis features
                    "facial_features": {
                        "brightness": round(face_brightness, 2),
                        "contrast": round(face_contrast, 2),
                        "expression_intensity": round(expression_intensity * 100, 2),  # Convert to percentage
                        "blur_score": round(blur_score, 2),
                        "is_clear": not is_blurry,
                        "face_size": {
                            "width": face_width,
                            "height": face_height,
                            "area": face_area
                        }
                    },
                    
                    # Insights and recommendations
                    "insights": insights,
                    
                    # Method used
                    "method": emotion_result.get('method', 'unknown'),
                    "note": emotion_result.get('note', None)
                }
                
                results.append(result)
                print(f"[EMOTION-DEEP] Face {idx + 1}: {emotion_result['dominant_emotion']} "
                      f"({emotion_result['confidence']:.2f}), intensity={expression_intensity:.3f}")
                
            except Exception as e:
                print(f"[EMOTION-DEEP] ERROR processing face {idx + 1}: {str(e)}")
                import traceback
                traceback.print_exc()
                results.append({
                    "face_box": face['box'],
                    "face_index": idx + 1,
                    "emotion": "unknown",
                    "emotion_label": "Không xác định" if request.language == 'vi' else "Unknown",
                    "confidence": 0.0,
                    "error": str(e)
                })
        
        print(f"[EMOTION-DEEP] Returning {len(results)} deep analysis results")
        return {
            "faces": results,
            "count": len(results),
            "analysis_type": "deep",
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"[EMOTION-DEEP] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/emotions")
async def get_emotion_labels():
    """
    Get list of all supported emotion labels in both Vietnamese and English.
    """
    return {
        "emotions": emotion_recognizer.emotion_labels
    }

@router.post("/music-recommendations")
async def get_music_recommendations(request: dict):
    """
    Get music recommendations based on detected emotion and mood.
    
    Request body:
    {
        "emotion": "happy",
        "mood_score": 0.8,
        "count": 3  // optional, default 3
    }
    """
    try:
        emotion = request.get('emotion', 'neutral')
        mood_score = request.get('mood_score', 0.0)
        count = request.get('count', 3)
        
        recommendations = music_recommender.get_music_recommendations(
            emotion=emotion,
            mood_score=mood_score,
            count=count
        )
        
        return {
            "emotion": emotion,
            "mood_score": mood_score,
            "recommendations": recommendations,
            "count": len(recommendations)
        }
        
    except Exception as e:
        print(f"[MUSIC-RECOMMENDATIONS] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/music-database")
async def get_music_database():
    """
    Get information about the music database.
    Returns available emotions and song counts.
    """
    try:
        emotions = music_recommender.get_all_emotions()
        counts = music_recommender.get_music_count_by_emotion()
        
        return {
            "emotions": emotions,
            "song_counts": counts,
            "total_songs": sum(counts.values())
        }
        
    except Exception as e:
        print(f"[MUSIC-DATABASE] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
