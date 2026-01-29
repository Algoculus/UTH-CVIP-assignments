from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import cv2
import numpy as np
import base64
from ..services.face_detection import FaceDetectionService
from ..services.face_analysis import FaceAnalysisService
from ..services.face_quality import FaceQualityService
from ..services.face_recognition import FaceRecognitionService

router = APIRouter(prefix="/face-analysis", tags=["face-analysis"])

# Initialize services
face_detector = FaceDetectionService()
face_analyzer = FaceAnalysisService()
quality_assessor = FaceQualityService()
face_recognizer = FaceRecognitionService()

class FaceAnalysisRequest(BaseModel):
    image: str  # Base64 encoded image
    modes: list = None  # Optional: ['age', 'gender', 'attributes', 'quality']
    language: str = 'en'  # 'en' or 'vi'

class FaceCompareRequest(BaseModel):
    image1: str  # Base64 encoded image
    image2: str  # Base64 encoded image
    threshold: float = 0.6  # Similarity threshold

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
async def analyze_face(request: FaceAnalysisRequest):
    """
    Comprehensive face analysis including age, gender, attributes, and quality.
    
    Request body:
    {
        "image": "base64_string",
        "modes": ["age", "gender", "attributes", "quality"],
        "language": "en"
    }
    """
    try:
        print(f"[FACE-ANALYZE] Received face analysis request")
        image = decode_base64_image(request.image)
        print(f"[FACE-ANALYZE] Image decoded: shape={image.shape}")
        
        # Detect faces
        faces = face_detector.detect_faces(image)
        print(f"[FACE-ANALYZE] Detected {len(faces)} faces")
        
        if len(faces) == 0:
            return {
                "faces": [],
                "count": 0,
                "message": "No faces detected" if request.language == 'en' else "Không tìm thấy khuôn mặt"
            }
        
        # Default modes if not specified
        modes = request.modes if request.modes and len(request.modes) > 0 else ['age', 'gender', 'attributes', 'quality']
        
        print(f"[FACE-ANALYZE] Requested modes: {modes}")
        
        results = []
        
        for idx, face in enumerate(faces):
            print(f"[FACE-ANALYZE] Processing face {idx + 1}/{len(faces)}")
            
            try:
                # Crop face
                face_image = face_detector.crop_face(image, face['box'])
                
                result = {
                    "face_box": face['box'],
                    "face_index": idx + 1
                }
                
                # Age analysis
                if 'age' in modes:
                    age_result = face_analyzer.analyze_age(face_image)
                    result['age'] = age_result['age']
                    result['age_confidence'] = age_result['age_confidence']
                
                # Gender analysis
                if 'gender' in modes:
                    gender_result = face_analyzer.analyze_gender(face_image)
                    result['gender'] = gender_result['gender']
                    result['gender_confidence'] = gender_result['gender_confidence']
                
                # Attributes analysis
                if 'attributes' in modes:
                    attributes_result = face_analyzer.analyze_attributes(face_image)
                    result['attributes'] = {
                        'glasses': attributes_result.get('glasses', False),
                        'beard': attributes_result.get('beard', False),
                        'hat': attributes_result.get('hat', False),
                        'mustache': attributes_result.get('mustache', False)
                    }
                
                # Quality assessment
                if 'quality' in modes:
                    try:
                        print(f"[FACE-ANALYZE] Assessing quality for face {idx + 1}")
                        quality_result = quality_assessor.assess_quality(
                            face_image,
                            face_box=face['box'],
                            keypoints=face.get('keypoints')
                        )
                        print(f"[FACE-ANALYZE] Quality result: {quality_result}")
                        result['quality'] = {
                            'overall_score': quality_result['overall_score'],
                            'blur_score': quality_result['blur_score'],
                            'brightness': quality_result['brightness'],
                            'contrast': quality_result['contrast'],
                            'angle': quality_result['angle'],
                            'symmetry': quality_result['symmetry'],
                            'face_size_score': quality_result['face_size_score'],
                            'occlusion_detected': quality_result['occlusion_detected'],
                            'quality_level': quality_result['quality_level'],
                            'recommendations': quality_result['recommendations']
                        }
                        print(f"[FACE-ANALYZE] Quality added to result")
                    except Exception as quality_error:
                        print(f"[FACE-ANALYZE] ERROR in quality assessment: {str(quality_error)}")
                        import traceback
                        traceback.print_exc()
                        # Don't fail the whole request, just skip quality
                        result['quality_error'] = str(quality_error)
                
                results.append(result)
                print(f"[FACE-ANALYZE] Face {idx + 1} analyzed successfully")
                
            except Exception as e:
                print(f"[FACE-ANALYZE] ERROR processing face {idx + 1}: {str(e)}")
                import traceback
                traceback.print_exc()
                results.append({
                    "face_box": face['box'],
                    "face_index": idx + 1,
                    "error": str(e)
                })
        
        print(f"[FACE-ANALYZE] Returning {len(results)} results")
        return {
            "faces": results,
            "count": len(results),
            "modes_analyzed": modes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FACE-ANALYZE] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_faces(request: FaceCompareRequest):
    """
    Compare two faces to determine if they are the same person.
    
    Request body:
    {
        "image1": "base64_string",
        "image2": "base64_string",
        "threshold": 0.6
    }
    """
    try:
        print(f"[FACE-COMPARE] Received face comparison request")
        
        # Decode images
        image1 = decode_base64_image(request.image1)
        image2 = decode_base64_image(request.image2)
        
        print(f"[FACE-COMPARE] Images decoded: shape1={image1.shape}, shape2={image2.shape}")
        
        # Detect faces in both images
        faces1 = face_detector.detect_faces(image1)
        faces2 = face_detector.detect_faces(image2)
        
        if len(faces1) == 0:
            raise HTTPException(status_code=400, detail="No face detected in first image")
        
        if len(faces2) == 0:
            raise HTTPException(status_code=400, detail="No face detected in second image")
        
        # Use first face from each image
        face1 = faces1[0]
        face2 = faces2[0]
        
        # Crop faces
        face_image1 = face_detector.crop_face(image1, face1['box'])
        face_image2 = face_detector.crop_face(image2, face2['box'])
        
        # Extract embeddings
        print(f"[FACE-COMPARE] Extracting embeddings...")
        try:
            embedding1 = face_recognizer.extract_embedding(face_image1)
            embedding2 = face_recognizer.extract_embedding(face_image2)
            print(f"[FACE-COMPARE] Embeddings extracted: len1={len(embedding1)}, len2={len(embedding2)}")
        except Exception as emb_error:
            print(f"[FACE-COMPARE] ERROR extracting embeddings: {str(emb_error)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to extract embeddings: {str(emb_error)}. Make sure FaceNet model is loaded."
            )
        
        # Calculate similarity
        emb1_array = np.array(embedding1)
        emb2_array = np.array(embedding2)
        
        similarity = face_recognizer.cosine_similarity(emb1_array, emb2_array)
        distance = face_recognizer.calculate_distance(embedding1, embedding2)
        
        # Determine if same person
        is_same_person = similarity >= request.threshold
        confidence = abs(similarity)  # Use absolute similarity as confidence
        
        print(f"[FACE-COMPARE] Similarity: {similarity:.4f}, Distance: {distance:.4f}, Same person: {is_same_person}")
        
        return {
            "similarity": float(similarity),
            "distance": float(distance),
            "is_same_person": bool(is_same_person),
            "confidence": float(confidence),
            "threshold": request.threshold,
            "face1_box": face1['box'],
            "face2_box": face2['box']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FACE-COMPARE] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis-modes")
async def get_analysis_modes():
    """
    Get list of available analysis modes.
    """
    return {
        "modes": [
            {
                "id": "age",
                "name": "Age Estimation",
                "description": "Estimate age from facial features"
            },
            {
                "id": "gender",
                "name": "Gender Detection",
                "description": "Detect gender (Male/Female)"
            },
            {
                "id": "attributes",
                "name": "Face Attributes",
                "description": "Detect glasses, beard, hat, mustache"
            },
            {
                "id": "quality",
                "name": "Quality Assessment",
                "description": "Assess image quality (blur, brightness, angle, etc.)"
            }
        ]
    }
