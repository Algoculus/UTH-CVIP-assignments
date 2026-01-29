/**
 * Image optimization utilities
 * Resize and compress images before sending to API to reduce payload size
 */

interface OptimizeImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

/**
 * Optimize image by resizing and compressing
 * @param imageDataUrl - Base64 data URL of the image
 * @param options - Optimization options
 * @returns Optimized base64 data URL
 */
export function optimizeImage(
  imageDataUrl: string,
  options: OptimizeImageOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1280,
      maxHeight = 720,
      quality = 0.85,
      format = 'image/jpeg'
    } = options

    const img = new Image()
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to optimized data URL
        const optimizedDataUrl = canvas.toDataURL(format, quality)
        
        // Log size reduction
        const originalSize = imageDataUrl.length
        const optimizedSize = optimizedDataUrl.length
        const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1)
        
        console.log(`[IMAGE-OPTIMIZE] Original: ${(originalSize / 1024).toFixed(1)}KB, Optimized: ${(optimizedSize / 1024).toFixed(1)}KB, Reduction: ${reduction}%`)

        resolve(optimizedDataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = imageDataUrl
  })
}

/**
 * Optimize image from file input
 * @param file - File object from input
 * @param options - Optimization options
 * @returns Optimized base64 data URL
 */
export function optimizeImageFromFile(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string
        if (!dataUrl) {
          reject(new Error('Failed to read file'))
          return
        }
        
        const optimized = await optimizeImage(dataUrl, options)
        resolve(optimized)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}
