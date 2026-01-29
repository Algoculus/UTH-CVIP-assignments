"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiUrl}/users`)
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      const response = await fetch(`${apiUrl}/users/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete user")
      }

      fetchUsers()
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-tech-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-tech-muted hover:text-tech-accent transition-colors"
            >
              <span>←</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-tech-accent"></div>
                <span className="font-mono text-sm tracking-wider">FACENET</span>
              </div>
            </button>
            <button
              onClick={() => router.push("/enroll")}
              className="px-6 py-2 bg-tech-accent text-on-accent font-mono text-sm tracking-wider hover:bg-tech-accent-dark transition-colors"
            >
              + ADD USER
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="mb-12">
          <div className="inline-block px-3 py-1 bg-card border border-tech-border mb-4">
            <span className="text-tech-accent text-xs font-mono tracking-wider">DATABASE</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            User Management
          </h1>
          <p className="text-tech-muted mt-2">Registered users in the neural network database</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 mb-6 font-mono text-sm">
            <span className="text-red-500">ERROR:</span> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-2 border-tech-border border-t-[#00ff88] animate-spin mb-4"></div>
              <p className="text-tech-muted font-mono text-sm">LOADING DATABASE...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-card border border-tech-border p-16 text-center">
            <div className="w-16 h-16 border-2 border-tech-border mx-auto mb-6 flex items-center justify-center">
              <span className="text-tech-muted text-2xl">∅</span>
            </div>
            <p className="text-tech-muted mb-6 font-mono text-sm">NO USERS IN DATABASE</p>
            <button
              onClick={() => router.push("/enroll")}
              className="px-8 py-3 bg-tech-accent text-on-accent font-mono text-sm tracking-wider hover:bg-tech-accent-dark transition-colors"
            >
              REGISTER FIRST USER
            </button>
          </div>
        ) : (
          <div className="bg-card border border-tech-border overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-background border-b border-tech-border">
              <div className="col-span-4 text-tech-accent text-xs font-mono tracking-wider">NAME</div>
              <div className="col-span-3 text-tech-accent text-xs font-mono tracking-wider">USER ID</div>
              <div className="col-span-3 text-tech-accent text-xs font-mono tracking-wider">CREATED</div>
              <div className="col-span-2 text-tech-accent text-xs font-mono tracking-wider text-right">ACTIONS</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-[#1a1a1a]">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-background transition-colors group"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="text-tech-muted text-xs font-mono">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-foreground font-medium">{user.name}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-tech-muted text-sm font-mono">{user.userId}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-tech-muted text-sm">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-4 py-1 border border-red-500/30 text-red-400 text-xs font-mono tracking-wider hover:bg-red-500/10 hover:border-red-500 transition-colors"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Stats */}
            <div className="px-6 py-4 bg-background border-t border-tech-border">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-tech-muted">TOTAL USERS</span>
                <span className="text-tech-accent">{users.length}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

