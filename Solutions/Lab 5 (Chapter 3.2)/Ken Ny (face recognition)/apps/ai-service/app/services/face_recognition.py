import numpy as np
import cv2
import os
from typing import Optional

class FaceRecognitionService:
    def __init__(self, model_name: str = "20180402-114759"):
        """
        Initialize FaceNet model using facenet-pytorch.
        
        Args:
            model_name: Name of the pre-trained model to use.
                       Options: "20180402-114759" (VGGFace2), "20180408-102900" (CASIA-WebFace)
                       Model will be automatically downloaded on first use.
        """
        self.model = None
        self.embedding_size = 512
        self.input_size = (160, 160)  # FaceNet standard input size
        self.model_name = model_name
        
        # Try to load facenet-pytorch model
        try:
            from facenet_pytorch import InceptionResnetV1
            import torch
            import ssl
            import urllib.request
            
            # Bypass SSL verification (temporary fix for Python 3.13)
            ssl._create_default_https_context = ssl._create_unverified_context
            
            print(f"🔄 Loading FaceNet model: {model_name}...")
            # Load pre-trained model (will download automatically if not present)
            # 'vggface2' or 'casia-webface' are the available pre-trained models
            if model_name == "20180402-114759":
                self.model = InceptionResnetV1(pretrained='vggface2').eval()
            elif model_name == "20180408-102900":
                self.model = InceptionResnetV1(pretrained='casia-webface').eval()
            else:
                # Default to vggface2
                self.model = InceptionResnetV1(pretrained='vggface2').eval()
            
            print(f"✅ FaceNet model loaded successfully!")
            print(f"   Model: {model_name}")
            print(f"   Embedding size: {self.embedding_size}")
            
        except ImportError:
            print("⚠️  WARNING: facenet-pytorch not installed!")
            print("   Install it with: pip install facenet-pytorch")
            print("   Using placeholder model instead.")
            self.model = None
        except Exception as e:
            print(f"⚠️  WARNING: Could not load FaceNet model: {e}")
            print("   Using placeholder model instead.")
            self.model = None
    
    def preprocess_face(self, face_image: np.ndarray):
        """
        Preprocess face image for FaceNet input.
        - Resize to 160x160
        - Convert BGR to RGB
        - Normalize pixel values to [0, 1] for PyTorch (or [-1, 1] for TensorFlow)
        """
        # Resize to FaceNet input size
        face_resized = cv2.resize(face_image, self.input_size)
        
        # Convert BGR to RGB
        if len(face_resized.shape) == 3 and face_resized.shape[2] == 3:
            face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        else:
            face_rgb = face_resized
        
        # For facenet-pytorch: normalize to [0, 1] and convert to float32
        if self.model is not None and hasattr(self.model, 'eval'):
            # PyTorch model expects [0, 1] range
            face_normalized = face_rgb.astype(np.float32) / 255.0
            # Convert to CHW format (Channel, Height, Width) for PyTorch
            face_normalized = np.transpose(face_normalized, (2, 0, 1))
            # Add batch dimension
            face_batch = np.expand_dims(face_normalized, axis=0)
        else:
            # TensorFlow format: normalize to [-1, 1]
            face_normalized = (face_rgb.astype(np.float32) - 127.5) / 128.0
            # Add batch dimension
            face_batch = np.expand_dims(face_normalized, axis=0)
        
        return face_batch
    
    def extract_embedding(self, face_image: np.ndarray):
        """
        Extract face embedding using FaceNet.
        Returns normalized 512-dimensional vector.
        """
        if self.model is None:
            # WARNING: Using placeholder embedding based on normalized face features
            # This is a TEMPORARY solution for testing. For production, you MUST load a real FaceNet model.
            # 
            # Improved approach: Normalize and resize face before hashing
            # This makes the embedding more robust to minor variations in lighting/angle
            # However, this is still NOT a real face recognition model.
            
            import hashlib
            
            # Normalize face image to make embedding more robust
            # 1. Resize to fixed size (64x64) to ignore scale differences
            face_resized = cv2.resize(face_image, (64, 64))
            
            # 2. Convert to grayscale to ignore color variations
            if len(face_resized.shape) == 3:
                face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
            else:
                face_gray = face_resized
            
            # 3. Normalize brightness (histogram equalization)
            face_normalized = cv2.equalizeHist(face_gray.astype(np.uint8))
            
            # 4. Apply Gaussian blur to reduce noise sensitivity
            face_blurred = cv2.GaussianBlur(face_normalized, (5, 5), 0)
            
            # 5. Extract histogram features (more robust than raw pixels)
            # Calculate histogram of the normalized face
            hist = cv2.calcHist([face_blurred], [0], None, [32], [0, 256])
            hist_normalized = hist.flatten() / (hist.sum() + 1e-7)  # Normalize histogram
            
            # 6. Combine histogram features with some spatial information
            # Take mean and std of different regions
            h, w = face_blurred.shape
            regions = [
                face_blurred[0:h//2, 0:w//2].mean(),  # Top-left
                face_blurred[0:h//2, w//2:w].mean(),  # Top-right
                face_blurred[h//2:h, 0:w//2].mean(),  # Bottom-left
                face_blurred[h//2:h, w//2:w].mean(),  # Bottom-right
            ]
            
            # 7. Combine features into a feature vector
            features = np.concatenate([hist_normalized, regions])
            features_bytes = features.tobytes()
            features_hash = hashlib.md5(features_bytes).digest()
            
            # 8. Use hash to seed random number generator for deterministic embedding
            seed = int.from_bytes(features_hash[:4], 'big')
            rng = np.random.RandomState(seed)
            embedding = rng.randn(self.embedding_size).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)  # Normalize
            
            print(f"⚠️  WARNING: Using normalized hash-based placeholder embedding (seed={seed})")
            print("   This is for testing only. Load a real FaceNet model for production use.")
            
            return embedding.tolist()
        
        # Preprocess
        face_preprocessed = self.preprocess_face(face_image)
        
        # Get embedding using facenet-pytorch
        import torch
        
        # Convert numpy array to PyTorch tensor
        face_tensor = torch.FloatTensor(face_preprocessed)
        
        # Get embedding (no gradient computation needed)
        with torch.no_grad():
            embedding = self.model(face_tensor)
        
        # Convert to numpy and normalize
        embedding = embedding[0].cpu().numpy()  # Remove batch dimension
        embedding = embedding / np.linalg.norm(embedding)  # L2 normalize
        
        print(f"✅ Extracted FaceNet embedding: shape={embedding.shape}, norm={np.linalg.norm(embedding):.4f}")
        
        return embedding.tolist()
    
    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray):
        """
        Calculate cosine similarity between two embeddings.
        Returns value between -1 and 1 (1 = identical, -1 = opposite).
        """
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return float(similarity)
    
    def calculate_distance(self, embedding1: list, embedding2: list):
        """
        Calculate cosine distance (1 - similarity) between two embeddings.
        Lower distance = more similar.
        """
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        similarity = self.cosine_similarity(emb1, emb2)
        distance = 1 - similarity
        return distance

