from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import cv2
import numpy as np
import base64
from ..services.face_detection import FaceDetectionService
from ..services.face_recognition import FaceRecognitionService

router = APIRouter(prefix="/face", tags=["face"])

# Initialize services
face_detector = FaceDetectionService()
face_recognizer = FaceRecognitionService()

class ImageRequest(BaseModel):
    image: str  # Base64 encoded image

class EmbeddingRequest(BaseModel):
    image: str  # Base64 encoded image
    face_box: list = None  # Optional: [x, y, width, height] to extract specific face

class RecognitionRequest(BaseModel):
    image: str  # Base64 encoded image
    embeddings: list  # List of embeddings to compare against
    user_ids: list  # Corresponding user IDs
    threshold: float = 0.8  # Distance threshold for recognition

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

@router.post("/detect")
async def detect_faces(request: ImageRequest):
    """Detect faces in an image."""
    try:
        print(f"[DETECT] Received face detection request")
        image = decode_base64_image(request.image)
        print(f"[DETECT] Image decoded: shape={image.shape}")
        faces = face_detector.detect_faces(image)
        print(f"[DETECT] Detected {len(faces)} faces")
        
        return {
            "faces": faces,
            "count": len(faces)
        }
    except Exception as e:
        print(f"[DETECT] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-embedding")
async def extract_embedding(request: EmbeddingRequest):
    """Extract face embedding from an image.
    
    If face_box is provided, extract embedding from that specific face region.
    Otherwise, detect faces and extract from the first face found.
    """
    try:
        print(f"[EXTRACT-EMBEDDING] Received embedding extraction request")
        image = decode_base64_image(request.image)
        print(f"[EXTRACT-EMBEDDING] Image decoded: shape={image.shape}")
        
        # If face_box is provided, use it directly
        if request.face_box and len(request.face_box) == 4:
            face_box = request.face_box
            print(f"[EXTRACT-EMBEDDING] Using provided face_box: {face_box}")
        else:
            # Detect faces
            faces = face_detector.detect_faces(image)
            print(f"[EXTRACT-EMBEDDING] Detected {len(faces)} faces")
            
            if len(faces) == 0:
                print(f"[EXTRACT-EMBEDDING] ERROR: No faces detected")
                raise HTTPException(status_code=400, detail="No faces detected in image")
            
            if len(faces) > 1:
                print(f"[EXTRACT-EMBEDDING] WARNING: Multiple faces detected, using first face")
            
            # Use the first face
            face_box = faces[0]['box']
            print(f"[EXTRACT-EMBEDDING] Face box: {face_box}")
        
        # Crop face
        face_image = face_detector.crop_face(image, face_box)
        print(f"[EXTRACT-EMBEDDING] Cropped face: shape={face_image.shape}")
        
        # Extract embedding
        embedding = face_recognizer.extract_embedding(face_image)
        print(f"[EXTRACT-EMBEDDING] Extracted embedding: length={len(embedding)}, type={type(embedding)}")
        print(f"[EXTRACT-EMBEDDING] Sample values: {embedding[:5]}")
        
        # Ensure embedding is a list of Python floats
        embedding_list = [float(x) for x in embedding]
        print(f"[EXTRACT-EMBEDDING] ✓ Embedding converted to list of floats")
        
        return {
            "embedding": embedding_list,
            "face_box": face_box
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[EXTRACT-EMBEDDING] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recognize")
async def recognize_faces(request: RecognitionRequest):
    """Recognize faces in an image by comparing with known embeddings."""
    try:
        print(f"[RECOGNIZE] Received request with {len(request.embeddings)} embeddings, threshold={request.threshold}")
        
        image = decode_base64_image(request.image)
        print(f"[RECOGNIZE] Image decoded: shape={image.shape}")
        
        # Detect faces
        faces = face_detector.detect_faces(image)
        print(f"[RECOGNIZE] Detected {len(faces)} faces")
        
        if len(faces) == 0:
            print("[RECOGNIZE] No faces detected, returning empty results")
            return {"results": []}
        
        if len(request.embeddings) == 0:
            print("[RECOGNIZE] No embeddings provided, returning Unknown for all faces")
            return {
                "results": [
                    {
                        "box": face['box'],
                        "name": "Unknown",
                        "distance": 1.0,
                        "confidence": 0.0
                    }
                    for face in faces
                ]
            }
        
        results = []
        
        for idx, face in enumerate(faces):
            print(f"[RECOGNIZE] Processing face {idx + 1}/{len(faces)}")
            # Crop face
            face_image = face_detector.crop_face(image, face['box'])
            
            # Extract embedding
            embedding = face_recognizer.extract_embedding(face_image)
            embedding_array = np.array(embedding)
            print(f"[RECOGNIZE] Extracted embedding: shape={embedding_array.shape}, norm={np.linalg.norm(embedding_array):.4f}")
            
            # Compare with known embeddings
            best_match = None
            best_distance = float('inf')
            
            for i, known_embedding in enumerate(request.embeddings):
                if isinstance(known_embedding, str):
                    # Parse PostgreSQL vector format: "[1,2,3,...]"
                    known_embedding = known_embedding.strip("[]").split(",")
                    known_embedding = [float(x) for x in known_embedding]
                
                known_emb_array = np.array(known_embedding)
                distance = face_recognizer.calculate_distance(embedding, known_embedding)
                
                print(f"[RECOGNIZE] Comparing with embedding {i+1}/{len(request.embeddings)}: distance={distance:.4f}, user_id={request.user_ids[i] if i < len(request.user_ids) else 'N/A'}")
                
                if distance < best_distance:
                    best_distance = distance
                    best_match = {
                        "user_id": request.user_ids[i] if i < len(request.user_ids) else None,
                        "distance": distance,
                        "similarity": 1 - distance
                    }
            
            print(f"[RECOGNIZE] Best match: user_id={best_match['user_id'] if best_match else None}, distance={best_distance:.4f}, threshold={request.threshold}")
            
            # Check if match is below threshold
            if best_match and best_distance <= request.threshold:
                results.append({
                    "box": face['box'],
                    "name": best_match["user_id"] or "Unknown",
                    "distance": best_match["distance"],
                    "confidence": best_match["similarity"]
                })
                print(f"[RECOGNIZE] ✓ Match found: {best_match['user_id']}")
            else:
                results.append({
                    "box": face['box'],
                    "name": "Unknown",
                    "distance": best_distance if best_match else 1.0,
                    "confidence": 0.0
                })
                print(f"[RECOGNIZE] ✗ No match (distance {best_distance:.4f} > threshold {request.threshold})")
        
        print(f"[RECOGNIZE] Returning {len(results)} results")
        return {"results": results}
    except Exception as e:
        print(f"[RECOGNIZE] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

