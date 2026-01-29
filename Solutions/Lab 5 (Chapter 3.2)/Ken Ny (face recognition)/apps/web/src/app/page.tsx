import Link from "next/link"
import { ModeToggle } from "@/components/button-theme"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-tech-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tech-accent"></div>
              <span className="text-foreground font-mono text-sm tracking-wider">FACE<span className="text-tech-accent">NET</span></span>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="mb-20">
          <div className="inline-block px-3 py-1 bg-card border border-tech-border mb-6">
            <span className="text-tech-accent text-xs font-mono tracking-wider">REAL-TIME AI SYSTEM</span>
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-6 tracking-tight">
            Face Recognition
            <br />
            <span className="text-tech-accent">Neural Network</span>
          </h1>
          <p className="text-xl text-tech-muted max-w-2xl">
            Advanced facial recognition powered by FaceNet deep learning architecture and MTCNN detection pipeline
          </p>
        </div>

        {/* Main Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-16">
          <Link
            href="/enroll"
            className="group bg-card border border-tech-border p-8 hover:border-tech-accent transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-tech-accent opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="text-tech-accent text-sm font-mono mb-4 tracking-wider">01</div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              Enrollment
            </h2>
            <p className="text-tech-muted text-sm leading-relaxed">
              Register new facial embeddings into the neural network database
            </p>
            <div className="mt-6 flex items-center gap-2 text-tech-accent text-sm font-mono">
              <span>REGISTER</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          <Link
            href="/recognition"
            className="group bg-card border border-tech-border p-8 hover:border-tech-accent transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-tech-accent opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="text-tech-accent text-sm font-mono mb-4 tracking-wider">02</div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              Recognition
            </h2>
            <p className="text-tech-muted text-sm leading-relaxed">
              Real-time facial detection and identification via WebSocket stream
            </p>
            <div className="mt-6 flex items-center gap-2 text-tech-accent text-sm font-mono">
              <span>IDENTIFY</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          <Link
            href="/emotion"
            className="group bg-card border border-tech-border p-8 hover:border-tech-accent transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-tech-accent opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="text-tech-accent text-sm font-mono mb-4 tracking-wider">03</div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              Emotion
            </h2>
            <p className="text-tech-muted text-sm leading-relaxed">
              Analyze facial emotions and mood states in real-time
            </p>
            <div className="mt-6 flex items-center gap-2 text-tech-accent text-sm font-mono">
              <span>ANALYZE</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          <Link
            href="/face-analysis"
            className="group bg-card border border-tech-border p-8 hover:border-tech-accent transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-tech-accent opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="text-tech-accent text-sm font-mono mb-4 tracking-wider">04</div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              Face Analysis
            </h2>
            <p className="text-tech-muted text-sm leading-relaxed">
              Comprehensive analysis: age, gender, attributes, and quality assessment
            </p>
            <div className="mt-6 flex items-center gap-2 text-tech-accent text-sm font-mono">
              <span>ANALYZE</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group bg-card border border-tech-border p-8 hover:border-tech-accent transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-tech-accent opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="text-tech-accent text-sm font-mono mb-4 tracking-wider">05</div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              Management
            </h2>
            <p className="text-tech-muted text-sm leading-relaxed">
              Monitor and manage registered users in the system database
            </p>
            <div className="mt-6 flex items-center gap-2 text-tech-accent text-sm font-mono">
              <span>MANAGE</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        </div>

        {/* Technical Specs */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-tech-border p-8">
            <h3 className="text-foreground font-bold mb-6 tracking-tight text-lg">System Architecture</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1 h-1 bg-tech-accent mt-2"></div>
                <div>
                  <div className="text-foreground text-sm font-mono">MTCNN Detection</div>
                  <div className="text-tech-muted text-xs">Multi-task Cascaded Convolutional Networks</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1 h-1 bg-tech-accent mt-2"></div>
                <div>
                  <div className="text-foreground text-sm font-mono">FaceNet Embedding</div>
                  <div className="text-tech-muted text-xs">512-dimensional face representation</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1 h-1 bg-tech-accent mt-2"></div>
                <div>
                  <div className="text-foreground text-sm font-mono">Vector Search</div>
                  <div className="text-tech-muted text-xs">PostgreSQL pgvector cosine similarity</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-tech-border p-8">
            <h3 className="text-foreground font-bold mb-6 tracking-tight text-lg">Performance Metrics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-tech-muted text-sm">Detection Speed</span>
                  <span className="text-tech-accent text-sm font-mono">~1 FPS</span>
                </div>
                <div className="h-1 bg-tech-border">
                  <div className="h-full w-4/5 bg-tech-accent"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-tech-muted text-sm">Embedding Size</span>
                  <span className="text-tech-accent text-sm font-mono">512-D</span>
                </div>
                <div className="h-1 bg-tech-border">
                  <div className="h-full w-full bg-tech-accent"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-tech-muted text-sm">Recognition Threshold</span>
                  <span className="text-tech-accent text-sm font-mono">0.8</span>
                </div>
                <div className="h-1 bg-tech-border">
                  <div className="h-full w-4/5 bg-tech-accent"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="border-t border-tech-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-xs text-tech-muted font-mono">
            <span>FACENET NEURAL NETWORK v1.0</span>
            <span>POWERED BY MTCNN + FACENET</span>
          </div>
        </div>
      </div>
    </div>
  )
}
