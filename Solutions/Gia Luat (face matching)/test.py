import os
import cv2
import numpy as np
from mtcnn.mtcnn import MTCNN
from keras_facenet import FaceNet

# =========================
# CONFIG
# =========================
KNOWN_DIR = "known"          # thư mục chứa ảnh người đã biết
THRESHOLD = 0.7             # similarity threshold
CAM_INDEX = 0               # webcam index (0 thường là webcam mặc định)
MIN_FACE_SIZE = 60          # bỏ qua mặt quá nhỏ (px)

# =========================
# HELPERS
# =========================
def l2_normalize(x: np.ndarray, eps: float = 1e-10) -> np.ndarray:
    return x / (np.linalg.norm(x) + eps)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = l2_normalize(a)
    b = l2_normalize(b)
    return float(np.dot(a, b))

def preprocess_face(face_bgr: np.ndarray, target_size=(160, 160)) -> np.ndarray:
    """
    FaceNet thường dùng input 160x160, RGB.
    Trả về mảng (160,160,3) RGB uint8.
    """
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_rgb = cv2.resize(face_rgb, target_size, interpolation=cv2.INTER_AREA)
    return face_rgb

def get_embedding(embedder: FaceNet, face_rgb_160: np.ndarray) -> np.ndarray:
    """
    keras-facenet: embeddings() nhận list/np array ảnh RGB (uint8 ok).
    """
    emb = embedder.embeddings([face_rgb_160])[0]  # shape (512,)
    return emb.astype(np.float32)

def safe_crop(frame: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    H, W = frame.shape[:2]
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(W, x + w)
    y2 = min(H, y + h)
    return frame[y1:y2, x1:x2], (x1, y1, x2, y2)

# =========================
# LOAD MODELS
# =========================
detector = MTCNN()
embedder = FaceNet()  # load FaceNet

# =========================
# BUILD KNOWN DATABASE
# =========================
known_embeddings = []
known_names = []

if not os.path.isdir(KNOWN_DIR):
    os.makedirs(KNOWN_DIR, exist_ok=True)
    print(f"[!] Đã tạo thư mục '{KNOWN_DIR}'. Hãy bỏ ảnh người quen vào đó rồi chạy lại.")
    raise SystemExit

image_files = [f for f in os.listdir(KNOWN_DIR) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
if len(image_files) == 0:
    print(f"[!] Thư mục '{KNOWN_DIR}' chưa có ảnh. Hãy thêm ảnh (jpg/png) rồi chạy lại.")
    raise SystemExit

print("[*] Đang tạo database embeddings từ thư mục known/ ...")
for fn in image_files:
    path = os.path.join(KNOWN_DIR, fn)
    img = cv2.imread(path)
    if img is None:
        print(f"[!] Không đọc được: {path}")
        continue

    # detect face in known image
    faces = detector.detect_faces(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    if len(faces) == 0:
        print(f"[!] Không phát hiện mặt trong: {fn}")
        continue

    # lấy face có confidence cao nhất
    faces = sorted(faces, key=lambda d: d.get("confidence", 0), reverse=True)
    x, y, w, h = faces[0]["box"]
    face_crop, _ = safe_crop(img, x, y, w, h)

    if face_crop.size == 0 or min(face_crop.shape[:2]) < MIN_FACE_SIZE:
        print(f"[!] Mặt quá nhỏ/lỗi crop trong: {fn}")
        continue

    face_160 = preprocess_face(face_crop)
    emb = get_embedding(embedder, face_160)

    name = os.path.splitext(fn)[0]  # tên = filename không đuôi
    known_embeddings.append(emb)
    known_names.append(name)
    print(f"    + Loaded: {name}")

known_embeddings = np.array(known_embeddings, dtype=np.float32)
if len(known_embeddings) == 0:
    print("[!] Không tạo được embeddings nào từ known/. Hãy dùng ảnh rõ mặt hơn.")
    raise SystemExit

print(f"[*] Database sẵn sàng: {len(known_embeddings)} người.\n")

# =========================
# REALTIME WEBCAM
# =========================
cap = cv2.VideoCapture(CAM_INDEX)
if not cap.isOpened():
    print("[!] Không mở được webcam.")
    raise SystemExit

print("[*] Nhấn 'q' để thoát.")
while True:
    ret, frame = cap.read()
    if not ret:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    detections = detector.detect_faces(rgb)

    for det in detections:
        conf = det.get("confidence", 0)
        if conf < 0.90:
            continue

        x, y, w, h = det["box"]
        face_crop, (x1, y1, x2, y2) = safe_crop(frame, x, y, w, h)

        if face_crop.size == 0:
            continue
        if min(face_crop.shape[:2]) < MIN_FACE_SIZE:
            continue

        face_160 = preprocess_face(face_crop)
        emb_live = get_embedding(embedder, face_160)

        # so khớp: lấy similarity lớn nhất
        sims = [cosine_similarity(emb_live, e) for e in known_embeddings]
        best_idx = int(np.argmax(sims))
        best_sim = float(sims[best_idx])
        best_name = known_names[best_idx]

        if best_sim > THRESHOLD:
            label = "Matched"
        else:
            label = "Unknown"

        # vẽ khung + text
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0) if label == "Matched" else (0, 0, 255), 2)
        text = f"{label} | sim={best_sim:.2f}"
        if label == "Matched":
            text += f" | {best_name}"
        cv2.putText(frame, text, (x1, max(0, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                    (0, 255, 0) if label == "Matched" else (0, 0, 255), 2)

    cv2.imshow("FaceNet + MTCNN Realtime", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
