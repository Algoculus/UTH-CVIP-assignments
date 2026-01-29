# 🎯 Real-time Face Recognition System

> Hệ thống nhận diện khuôn mặt thời gian thực sử dụng Webcam với **FaceNet** & **MTCNN**

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng](#-tính-năng)
- [Công nghệ](#️-công-nghệ)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Scripts](#-scripts)
- [Tài liệu tham khảo](#-tài-liệu-tham-khảo)

## 🎯 Giới thiệu

Dự án xây dựng một **hệ thống nhận diện khuôn mặt thời gian thực** từ webcam với khả năng:

- ✅ **Đăng ký khuôn mặt** (Face Enrollment) - Lưu trữ embedding của người dùng
- ✅ **Nhận diện realtime** - Phát hiện và xác định danh tính từ video stream
- ✅ **Giao diện web trực quan** - Hiển thị kết quả nhận diện trực tiếp với bounding box

Hệ thống sử dụng **kiến trúc Monorepo** với Turborepo và pnpm, tách biệt giữa:
- **Frontend** (Next.js)
- **Backend API** (Fastify)
- **AI Service** (FastAPI + MTCNN + FaceNet)

Đảm bảo khả năng mở rộng, hiệu năng cao và dễ bảo trì.

## ✨ Tính năng

### 1. Đăng ký khuôn mặt (Face Enrollment)
- Nhập thông tin người dùng (name, userId)
- Chụp ảnh từ webcam
- Trích xuất face embedding bằng **FaceNet**
- Lưu trữ embedding vào **PostgreSQL**

### 2. Nhận diện khuôn mặt realtime
- Stream video từ webcam với tốc độ 5-10 FPS
- Phát hiện khuôn mặt bằng **MTCNN**
- Trích xuất embedding và so sánh với database
- Trả về kết quả nhận diện (tên + độ tin cậy)

### 3. Hiển thị trực tiếp
- Vẽ **bounding box** xung quanh khuôn mặt
- Hiển thị **tên người** và **confidence score**
- Cập nhật realtime qua WebSocket

## 🛠️ Công nghệ

### Monorepo
- **Turborepo** - Build system và task runner
- **pnpm** - Package manager

### Frontend (Web App)
- **Next.js** - React framework
- **TypeScript** - Type safety
- **HTML5 Canvas** - Vẽ bounding box
- **WebRTC** (getUserMedia) - Truy cập webcam
- **WebSocket** - Giao tiếp realtime

### Backend (API Server)
- **Fastify** - High-performance web framework
- **WebSocket** (fastify-websocket) - Realtime communication
- **PostgreSQL** - Database
- **TypeScript** - Type safety
- **Prisma** (optional) - ORM

### AI Service
- **Python 3.x**
- **FastAPI** - Modern API framework
- **OpenCV** - Image processing
- **MTCNN** - Multi-task Cascaded Convolutional Networks (Face Detection)
- **FaceNet** - Face recognition model (Face Embedding)
- **NumPy** - Numerical computing

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────┐
│   Browser (Next.js + Canvas)    │
│        - WebRTC Stream          │
│        - Canvas Rendering       │
└────────────┬────────────────────┘
             │ WebSocket
             │ (Video Frames)
             ▼
┌─────────────────────────────────┐
│      Backend (Fastify API)      │
│    - WebSocket Handler          │
│    - REST API                   │
│    - Business Logic             │
└────────────┬────────────────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
┌──────────┐  ┌──────────────────┐
│PostgreSQL│  │   AI Service     │
│          │  │   (FastAPI)      │
│Embeddings│  │  ┌──────────┐    │
│  Users   │  │  │  MTCNN   │    │
└──────────┘  │  │   ↓      │    │
              │  │ FaceNet  │    │
              │  └──────────┘    │
              └──────────────────┘
```

### Luồng xử lý

1. **Frontend** capture frame từ webcam → gửi qua WebSocket
2. **Backend** nhận frame → forward đến AI Service
3. **AI Service**:
   - Phát hiện khuôn mặt (MTCNN)
   - Trích xuất embedding (FaceNet)
   - So sánh với database (cosine similarity)
4. **Backend** nhận kết quả → gửi về Frontend
5. **Frontend** vẽ bounding box + hiển thị tên người

## 📁 Cấu trúc dự án

```
FaceNet-And-MTCNN/
├── apps/
│   ├── web/              # Frontend (Next.js)
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── public/
│   ├── api/              # Backend (Fastify)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── plugins/
│   │   │   └── app.ts
│   │   └── prisma/
│   └── ai-service/       # AI Service (Python)
│       ├── app/
│       │   ├── models/
│       │   ├── services/
│       │   ├── routers/
│       │   └── main.py
│       └── requirements.txt
├── packages/
│   ├── ui/               # Shared UI components
│   ├── typescript-config/# Shared tsconfig
│   └── eslint-config/    # Shared ESLint config
├── docs/
│   └── plan.md          # Implementation plan
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # pnpm workspace config
├── turbo.json           # Turborepo config
└── README.md
```

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu hệ thống

- **Node.js** >= 18.x
- **pnpm** >= 10.x
- **Python** >= 3.8
- **PostgreSQL** >= 14.x

### 1. Clone repository

```bash
git clone <repository-url>
cd FaceNet-And-MTCNN
```

### 2. Cài đặt dependencies

```bash
# Install all packages (monorepo)
pnpm install
```

### 3. Cấu hình environment variables

#### Backend API (apps/api/.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/face_recognition"
AI_SERVICE_URL="http://localhost:9000"
PORT=8080
```

#### Frontend (apps/web/.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:8080"
NEXT_PUBLIC_WS_URL="ws://localhost:8080"
```

#### AI Service (apps/ai-service/.env)
```env
PORT=9000
RECOGNITION_THRESHOLD=0.8
```

### 4. Khởi tạo database

```bash
# Run migrations (if using Prisma)
pnpm --filter api prisma migrate dev
```

### 5. Cài đặt AI Service

```bash
cd apps/ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 6. Chạy dự án

#### Option 1: Chạy tất cả services (recommended)
```bash
pnpm dev
```

#### Option 2: Chạy từng service riêng lẻ

**Terminal 1 - Frontend:**
```bash
pnpm dev:web
# Chạy tại http://localhost:3000
```

**Terminal 2 - Backend API:**
```bash
pnpm dev:api
# Chạy tại http://localhost:8080
```

**Terminal 3 - AI Service:**
```bash
cd apps/ai-service
source venv/bin/activate
uvicorn app.main:app --reload --port 9000
# Chạy tại http://localhost:9000
```

## 📜 Scripts

```bash
# Development
pnpm dev              # Chạy tất cả services
pnpm dev:web          # Chỉ chạy frontend
pnpm dev:api          # Chỉ chạy backend

# Build
pnpm build            # Build tất cả packages

# Code quality
pnpm lint             # Lint tất cả packages
pnpm format           # Format code với Prettier
pnpm check-types      # TypeScript type checking
pnpm test             # Run tests

# Clean
pnpm clean            # Clean build artifacts
```

## 📚 Tài liệu tham khảo

- [Kế hoạch triển khai chi tiết](docs/plan.md)
- [FaceNet Paper](https://arxiv.org/abs/1503.03832)
- [MTCNN Paper](https://arxiv.org/abs/1604.02878)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://fastify.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
