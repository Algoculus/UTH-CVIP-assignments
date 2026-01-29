import cv2
import numpy as np
from mtcnn import MTCNN

class FaceDetectionService:
    def __init__(self):
        self.detector = MTCNN()
    
    def detect_faces(self, image: np.ndarray):
        """
        Detect faces in an image using MTCNN.
        Returns list of detected faces with bounding boxes and landmarks.
        """
        try:
            results = self.detector.detect_faces(image)
        except ValueError as e:
            # Handle MTCNN bug when no faces are detected in intermediate stages
            # This happens when P-Net or R-Net filters out all candidates, 
            # resulting in an empty tensor (0, 48, 48, 3) being passed to O-Net
            error_msg = str(e)
            if "empty output" in error_msg or "shape=(0," in error_msg:
                print(f"⚠️  MTCNN internal error (no faces detected in intermediate stages): {error_msg}")
                return []  # Return empty list - no faces detected
            else:
                # Re-raise if it's a different ValueError
                raise
        
        faces = []
        
        for result in results:
            if result['confidence'] > 0.9:  # Confidence threshold
                box = result['box']
                keypoints = result['keypoints']
                faces.append({
                    'box': [int(box[0]), int(box[1]), int(box[2]), int(box[3])],  # x, y, width, height - convert to Python int
                    'confidence': float(result['confidence']),  # convert to Python float
                    'keypoints': {k: (int(v[0]), int(v[1])) for k, v in keypoints.items()}  # convert keypoints to Python int
                })
        
        return faces
    
    def crop_face(self, image: np.ndarray, box: list):
        """
        Crop face from image based on bounding box.
        box: [x, y, width, height]
        """
        x, y, w, h = box
        # Add some padding
        padding = 10
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(image.shape[1] - x, w + 2 * padding)
        h = min(image.shape[0] - y, h + 2 * padding)
        
        face = image[y:y+h, x:x+w]
        return face

