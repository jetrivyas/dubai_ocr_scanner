import './style.css'
import cv from '@techstark/opencv-js'

cv['onRuntimeInitialized'] = () => {

    console.log('OpenCV Loaded Successfully')
}

const app = document.querySelector<HTMLDivElement>('#app')!

let currentDocumentType: 'passport' | 'id' | null = null
let capturedImages: { front?: string; back?: string } = {}
let captureComplete = false
let waitingForBackConfirmation = false

// Initial selection screen
function showSelectionScreen() {
    app.innerHTML = `
        <div class="selection-screen">
            <div class="selection-container">
                <h1>📄 Document Scanner</h1>
                <p>Select document type to scan</p>
                
                <div class="selection-buttons">
                    <button class="selection-btn passport-btn" id="selectPassport">
                        <div class="btn-icon">🛂</div>
                        <div class="btn-title">Passport</div>
                        <div class="btn-desc">Scan passport document</div>
                    </button>
                    
                    <button class="selection-btn id-btn" id="selectId">
                        <div class="btn-icon">🪪</div>
                        <div class="btn-title">ID Card</div>
                        <div class="btn-desc">Scan front & back of ID</div>
                    </button>
                </div>
            </div>
        </div>
    `
    
    document.getElementById('selectPassport')?.addEventListener('click', () => {
        currentDocumentType = 'passport'
        capturedImages = {}
        captureComplete = false
        waitingForBackConfirmation = false
        stableFrameCount = 0
        showScannerScreen()
    })
    
    document.getElementById('selectId')?.addEventListener('click', () => {
        currentDocumentType = 'id'
        capturedImages = {}
        captureComplete = false
        waitingForBackConfirmation = false
        stableFrameCount = 0
        showScannerScreen()
    })
}

function showScannerScreen() {
    const isId = currentDocumentType === 'id'
    
    app.innerHTML = `
        <div class="scanner-root">

            <video
                id="video"
                autoplay
                playsinline
                muted
            ></video>

            <canvas id="canvas"></canvas>

            <div class="overlay">

                <div class="scanner-frame">

                    <div class="corner top-left"></div>
                    <div class="corner top-right"></div>
                    <div class="corner bottom-left"></div>
                    <div class="corner bottom-right"></div>

                    <div class="scanner-text">
                        ${isId && !capturedImages.front 
                            ? 'Position ID FRONT inside frame' 
                            : isId && capturedImages.front 
                            ? 'Position ID BACK inside frame'
                            : 'Position passport inside frame'}
                    </div>

                </div>

            </div>

            <div class="stats-panel">

                <div class="stat-row">
                    <span>Blur</span>
                    <span id="blurValue">0%</span>
                </div>

                <div class="stat-row">
                    <span>Brightness</span>
                    <span id="brightnessValue">0%</span>
                </div>

                <div class="stat-row">
                    <span>Stability</span>
                    <span id="stabilityValue">0%</span>
                </div>

                <div class="stat-row">
                    <span>Clarity</span>
                    <span id="clarityValue">0%</span>
                </div>

            </div>

            <button
                id="backButton"
                class="back-button"
            >
                ← Back
            </button>

            <button
                id="readyForBackButton"
                class="ready-back-button"
                style="display: none;"
            >
                ✓ Ready for Back Side
            </button>

            <div
                class="capture-status"
                id="captureStatus"
            >
                Ready to scan
            </div>

        </div>
    `
    
    startCamera()
    
    document.getElementById('backButton')?.addEventListener('click', () => {
        stopCamera()
        captureComplete = false
        waitingForBackConfirmation = false
        capturedImages = {}
        stableFrameCount = 0
        showSelectionScreen()
    })
    
    document.getElementById('readyForBackButton')?.addEventListener('click', () => {
        waitingForBackConfirmation = false
        captureComplete = false // Reset to allow back side capture
        stableFrameCount = 0 // Reset stability counter
        const button = document.getElementById('readyForBackButton') as HTMLButtonElement
        if (button) button.style.display = 'none'
        
        const captureStatus = document.getElementById('captureStatus')
        if (captureStatus) {
            captureStatus.innerText = 'Ready to scan back'
            captureStatus.style.backgroundColor = ''
        }
        
        // Update scanner text
        const scannerText = document.querySelector('.scanner-text')
        if (scannerText) {
            scannerText.textContent = 'Position ID BACK inside frame'
        }
        
        console.log('✓ Ready for back side - auto-capture re-enabled')
    })
}

let videoStream: MediaStream | null = null

async function startCamera() {

    const video = document.getElementById('video') as HTMLVideoElement
    if (!video) return

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal: 'environment'
                    },

                    width: {
                        ideal: 1920
                    },

                    height: {
                        ideal: 1080
                    }

                },

                audio: false
            })

        videoStream = stream
        video.srcObject = stream

        video.onloadedmetadata = () => {

            video.play()

            console.log(
                'Camera Started'
            )

            startOpenCVProcessing()
        }

    } catch (err) {

        console.error(err)

        alert('Camera access failed')
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop())
        videoStream = null
    }
}

function startOpenCVProcessing() {

    setInterval(() => {

        analyzeFrame()

    }, 300)
}

function analyzeFrame() {

    const video = document.getElementById('video') as HTMLVideoElement
    if (!video) return

    if (
        !video.videoWidth ||
        !video.videoHeight
    ) return

    const tempCanvas =
        document.createElement('canvas')

    tempCanvas.width =
        video.videoWidth

    tempCanvas.height =
        video.videoHeight

    const ctx =
        tempCanvas.getContext('2d')

    if (!ctx) return

    ctx.drawImage(
        video,
        0,
        0
    )

    const src =
        cv.imread(tempCanvas)

    const gray =
        new cv.Mat()

    cv.cvtColor(
        src,
        gray,
        cv.COLOR_RGBA2GRAY
    )

    // =========================
    // BLUR DETECTION
    // =========================

    const laplacian =
        new cv.Mat()

    cv.Laplacian(
        gray,
        laplacian,
        cv.CV_64F
    )

    const mean = new cv.Mat()
    const stddev = new cv.Mat()

    cv.meanStdDev(
        laplacian,
        mean,
        stddev
    )

    const blurVariance =
        Math.pow(
            stddev.doubleAt(0, 0),
            2
        )

    let blurScore =
        Math.min(
            100,
            Math.floor(
                blurVariance / 10
            )
        )

    // =========================
    // BRIGHTNESS
    // =========================

    const brightness =
        cv.mean(gray)[0]

    let brightnessScore =
        Math.min(
            100,
            Math.floor(
                brightness / 2.55
            )
        )

    // =========================
    // EDGE / CLARITY
    // =========================

    const edges =
        new cv.Mat()

    cv.Canny(
        gray,
        edges,
        100,
        200
    )

    const edgePixels =
        cv.countNonZero(edges)

    const totalPixels =
        edges.rows * edges.cols

    const clarity =
        (edgePixels / totalPixels) * 1000

    let clarityScore =
        Math.min(
            100,
            Math.floor(clarity)
        )

    // =========================
    // STABILITY (TEMP MOCK)
    // =========================

    let stabilityScore = 90

    // =========================
    // UPDATE UI
    // =========================

    updateUI(
        blurScore,
        brightnessScore,
        stabilityScore,
        clarityScore
    )

    // =========================
    // AUTO CAPTURE
    // =========================

    // Don't capture if already complete or waiting for confirmation
    if (captureComplete) {
        console.log('⏸️ Capture already complete, skipping')
        return
    }
    
    if (waitingForBackConfirmation) {
        console.log('⏸️ Waiting for back confirmation, skipping')
        return
    }

    // STRICT quality thresholds for better OCR
    const BLUR_THRESHOLD = 10
    const BRIGHTNESS_THRESHOLD = 20
    const CLARITY_THRESHOLD = 15
    
    const meetsQuality = 
        blurScore > BLUR_THRESHOLD &&
        brightnessScore > BRIGHTNESS_THRESHOLD &&
        clarityScore > CLARITY_THRESHOLD

    // Check stability - scores shouldn't change too much between frames
    const isStable = 
        Math.abs(blurScore - lastBlurScore) < 10 &&
        Math.abs(brightnessScore - lastBrightnessScore) < 10 &&
        Math.abs(clarityScore - lastClarityScore) < 10

    // Update last scores
    lastBlurScore = blurScore
    lastBrightnessScore = brightnessScore
    lastClarityScore = clarityScore

    if (meetsQuality && isStable) {
        stableFrameCount++
        console.log(`✓ Quality good & stable (${stableFrameCount}/${REQUIRED_STABLE_FRAMES})`)
        
        if (stableFrameCount >= REQUIRED_STABLE_FRAMES) {
            console.log('🎯 STABLE CAPTURE - Quality maintained for required frames!')
            stableFrameCount = 0 // Reset
            autoCapture(tempCanvas)
        }
    } else {
        // Reset stability counter if quality drops or movement detected
        if (stableFrameCount > 0) {
            console.log(`⚠️ Stability lost - resetting (was ${stableFrameCount}/${REQUIRED_STABLE_FRAMES})`)
        }
        stableFrameCount = 0
    }

    src.delete()
    gray.delete()
    laplacian.delete()
    mean.delete()
    stddev.delete()
    edges.delete()
}

function updateUI(

    blur: number,
    brightness: number,
    stability: number,
    clarity: number

) {

    const blurElement =
        document.getElementById(
            'blurValue'
        )

    const brightnessElement =
        document.getElementById(
            'brightnessValue'
        )

    const stabilityElement =
        document.getElementById(
            'stabilityValue'
        )

    const clarityElement =
        document.getElementById(
            'clarityValue'
        )

    if (blurElement)
        blurElement.innerText =
            blur + '%'

    if (brightnessElement)
        brightnessElement.innerText =
            brightness + '%'

    if (stabilityElement)
        stabilityElement.innerText =
            stability + '%'

    if (clarityElement)
        clarityElement.innerText =
            clarity + '%'

    const captureStatus = document.getElementById('captureStatus')

    const BLUR_THRESHOLD = 10
    const BRIGHTNESS_THRESHOLD = 20
    const CLARITY_THRESHOLD = 15

    if (
        blur > BLUR_THRESHOLD &&
        brightness > BRIGHTNESS_THRESHOLD &&
        clarity > CLARITY_THRESHOLD
    ) {
        if (captureStatus) {
            const progress = Math.min(stableFrameCount, REQUIRED_STABLE_FRAMES)
            const bars = '█'.repeat(progress) + '░'.repeat(REQUIRED_STABLE_FRAMES - progress)
            captureStatus.innerText = `✓ Hold steady ${bars} ${progress}/${REQUIRED_STABLE_FRAMES}`
            captureStatus.style.backgroundColor = '#10b981'
        }
    } else {
        if (captureStatus && !captureStatus.innerText.includes('captured') && !captureStatus.innerText.includes('Processing')) {
            const issues = []
            if (blur <= BLUR_THRESHOLD) issues.push(`Blur ${blur}% (need >${BLUR_THRESHOLD})`)
            if (brightness <= BRIGHTNESS_THRESHOLD) issues.push(`Bright ${brightness}% (need >${BRIGHTNESS_THRESHOLD})`)
            if (clarity <= CLARITY_THRESHOLD) issues.push(`Clear ${clarity}% (need >${CLARITY_THRESHOLD})`)
            
            captureStatus.innerText = `Improve: ${issues.join(', ')}`
            captureStatus.style.backgroundColor = ''
        }
    }
}

let isCapturing = false
let lastCaptureTime = 0
const CAPTURE_COOLDOWN = 3000

// Stability tracking
let stableFrameCount = 0
const REQUIRED_STABLE_FRAMES = 3 // Reduced from 5 to 3 frames (0.9 seconds)
let lastBlurScore = 0
let lastBrightnessScore = 0
let lastClarityScore = 0

function autoCapture(sourceCanvas: HTMLCanvasElement) {
    
    const now = Date.now()
    
    console.log(`autoCapture called - isCapturing: ${isCapturing}, cooldown: ${now - lastCaptureTime}ms`)
    
    // Prevent multiple captures
    if (isCapturing || (now - lastCaptureTime) < CAPTURE_COOLDOWN) {
        console.log('⏸️ Skipping capture (cooldown or already capturing)')
        return
    }
    
    console.log('🎬 Starting capture process...')
    isCapturing = true
    lastCaptureTime = now

    const captureStatus = document.getElementById('captureStatus')
    
    if (captureStatus) {
        captureStatus.innerText = '📸 Capturing...'
        captureStatus.style.backgroundColor = '#3b82f6'
    }

    console.log('📸 Auto-capture triggered, detecting and cropping...')

    // Detect and crop the document
    const croppedCanvas = detectAndCropDocument(sourceCanvas)
    
    if (!croppedCanvas) {
        console.warn('⚠️ Could not detect document clearly')
        isCapturing = false
        return
    }

    // Convert to base64 image with MAXIMUM quality
    const imageData = croppedCanvas.toDataURL('image/jpeg', 1.0)

    console.log(`📊 Image dimensions: ${croppedCanvas.width}x${croppedCanvas.height}`)
    console.log(`📦 Image size: ${(imageData.length / 1024).toFixed(2)} KB`)

    // Save image to server
    saveImageToServer(imageData, currentDocumentType!)

    // Handle ID card (needs front and back)
    if (currentDocumentType === 'id') {
        if (!capturedImages.front) {
            // First capture - front side
            capturedImages.front = imageData
            captureComplete = true // Stop auto-capture
            waitingForBackConfirmation = true
            console.log('✅ Front side captured')
            
            if (captureStatus) {
                captureStatus.innerText = '✅ Front captured! Click button when ready for back'
                captureStatus.style.backgroundColor = '#10b981'
            }
            
            // Show "Ready for Back" button
            const readyButton = document.getElementById('readyForBackButton') as HTMLButtonElement
            if (readyButton) {
                readyButton.style.display = 'block'
            }
            
            isCapturing = false
            
            return
        } else {
            // Second capture - back side
            capturedImages.back = imageData
            captureComplete = true // Stop auto-capture permanently
            console.log('✅ Back side captured, sending to API...')
            
            if (captureStatus) {
                captureStatus.innerText = '📤 Sending to API...'
                captureStatus.style.backgroundColor = '#3b82f6'
            }
            
            // Send both images to API
            sendToOCRAPI(capturedImages.front, capturedImages.back, 'id')
                .then(result => {
                    console.log('✅ OCR Result:', result)
                    
                    if (captureStatus) {
                        captureStatus.innerText = '✅ ID processed! View results below'
                        captureStatus.style.backgroundColor = '#10b981'
                    }

                    isCapturing = false
                    // Don't go back to selection, just show results
                })
                .catch(error => {
                    console.error('❌ OCR Error:', error)
                    
                    if (captureStatus) {
                        captureStatus.innerText = '❌ Processing failed'
                        captureStatus.style.backgroundColor = '#ef4444'
                    }

                    setTimeout(() => {
                        if (captureStatus) {
                            captureStatus.innerText = 'Click Back to try again'
                            captureStatus.style.backgroundColor = ''
                        }
                        isCapturing = false
                    }, 3000)
                })
        }
    } else {
        // Passport - single image
        captureComplete = true // Stop auto-capture
        console.log('📸 Passport captured, sending to API...')

        sendToOCRAPI(imageData, undefined, 'passport')
            .then(result => {
                console.log('✅ OCR Result:', result)
                
                if (captureStatus) {
                    captureStatus.innerText = '✅ Passport processed! View results below'
                    captureStatus.style.backgroundColor = '#10b981'
                }

                isCapturing = false
                // Don't go back to selection, just show results
            })
            .catch(error => {
                console.error('❌ OCR Error:', error)
                
                if (captureStatus) {
                    captureStatus.innerText = '❌ Processing failed'
                    captureStatus.style.backgroundColor = '#ef4444'
                }

                setTimeout(() => {
                    if (captureStatus) {
                        captureStatus.innerText = 'Click Back to try again'
                        captureStatus.style.backgroundColor = ''
                    }
                    isCapturing = false
                }, 3000)
            })
    }
}

function detectAndCropDocument(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement | null {
    
    try {
        const src = cv.imread(sourceCanvas)
        const gray = new cv.Mat()
        const blurred = new cv.Mat()
        const edges = new cv.Mat()
        
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
        
        // Apply Gaussian blur to reduce noise
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
        
        // Edge detection
        cv.Canny(blurred, edges, 50, 150)
        
        // Dilate edges to close gaps
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
        cv.dilate(edges, edges, kernel)
        
        // Find contours
        const contours = new cv.MatVector()
        const hierarchy = new cv.Mat()
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
        
        let largestContour = null
        let maxArea = 0
        
        // Find the largest rectangular contour
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i)
            const area = cv.contourArea(contour)
            const peri = cv.arcLength(contour, true)
            const approx = new cv.Mat()
            
            cv.approxPolyDP(contour, approx, 0.02 * peri, true)
            
            // Look for quadrilateral (4 points) with significant area
            if (approx.rows === 4 && area > maxArea && area > (src.rows * src.cols * 0.1)) {
                maxArea = area
                if (largestContour) largestContour.delete()
                largestContour = approx
            } else {
                approx.delete()
            }
        }
        
        if (!largestContour) {
            console.warn('No document contour found, using center crop')
            // Fallback: crop center portion (80% of frame)
            const cropWidth = Math.floor(src.cols * 0.8)
            const cropHeight = Math.floor(src.rows * 0.8)
            const x = Math.floor((src.cols - cropWidth) / 2)
            const y = Math.floor((src.rows - cropHeight) / 2)
            
            const rect = new cv.Rect(x, y, cropWidth, cropHeight)
            const cropped = src.roi(rect)
            
            // Send original image without enhancement
            const outputCanvas = document.createElement('canvas')
            cv.imshow(outputCanvas, cropped)
            
            // Cleanup
            src.delete()
            gray.delete()
            blurred.delete()
            edges.delete()
            kernel.delete()
            contours.delete()
            hierarchy.delete()
            cropped.delete()
            
            return outputCanvas
        }
        
        console.log('✓ Document contour detected')
        
        // Get the 4 corner points
        const points = []
        for (let i = 0; i < 4; i++) {
            points.push({
                x: largestContour.data32S[i * 2],
                y: largestContour.data32S[i * 2 + 1]
            })
        }
        
        // Order points: top-left, top-right, bottom-right, bottom-left
        points.sort((a, b) => a.y - b.y)
        const topPoints = points.slice(0, 2).sort((a, b) => a.x - b.x)
        const bottomPoints = points.slice(2, 4).sort((a, b) => a.x - b.x)
        
        const orderedPoints = [
            topPoints[0],      // top-left
            topPoints[1],      // top-right
            bottomPoints[1],   // bottom-right
            bottomPoints[0]    // bottom-left
        ]
        
        // Calculate dimensions for perspective transform
        const width = Math.max(
            Math.hypot(orderedPoints[1].x - orderedPoints[0].x, orderedPoints[1].y - orderedPoints[0].y),
            Math.hypot(orderedPoints[2].x - orderedPoints[3].x, orderedPoints[2].y - orderedPoints[3].y)
        )
        
        const height = Math.max(
            Math.hypot(orderedPoints[3].x - orderedPoints[0].x, orderedPoints[3].y - orderedPoints[0].y),
            Math.hypot(orderedPoints[2].x - orderedPoints[1].x, orderedPoints[2].y - orderedPoints[1].y)
        )
        
        // Source points (detected corners)
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            orderedPoints[0].x, orderedPoints[0].y,
            orderedPoints[1].x, orderedPoints[1].y,
            orderedPoints[2].x, orderedPoints[2].y,
            orderedPoints[3].x, orderedPoints[3].y
        ])
        
        // Destination points (rectangle)
        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            width, 0,
            width, height,
            0, height
        ])
        
        // Get perspective transform matrix
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints)
        
        // Apply perspective transform
        const warped = new cv.Mat()
        cv.warpPerspective(src, warped, M, new cv.Size(width, height))
        
        // Create output canvas with original colors (no enhancement)
        const outputCanvas = document.createElement('canvas')
        cv.imshow(outputCanvas, warped)
        
        console.log(`✓ Document cropped: ${Math.floor(width)}x${Math.floor(height)}px`)
        
        // Cleanup
        src.delete()
        gray.delete()
        blurred.delete()
        edges.delete()
        kernel.delete()
        contours.delete()
        hierarchy.delete()
        largestContour.delete()
        srcPoints.delete()
        dstPoints.delete()
        M.delete()
        warped.delete()
        
        return outputCanvas
        
    } catch (error) {
        console.error('Error in document detection:', error)
        return null
    }
}

async function sendToOCRAPI(frontImage: string, backImage?: string, docType: 'passport' | 'id' = 'passport') {
    
    // Document Extraction API endpoint
    const API_ENDPOINT = docType === 'passport' 
        ? 'https://jumeirah-ai.testyourapp.online/extract_passport'
        : 'https://jumeirah-ai.testyourapp.online/extract_id'
    
    try {
        console.log(`🔄 Preparing ${docType} for API...`)
        
        // Convert base64 to blob for multipart/form-data
        const frontBlob = base64ToBlob(frontImage)
        
        console.log(`📦 Front image size: ${(frontBlob.size / 1024).toFixed(2)} KB`)
        
        // Create FormData
        const formData = new FormData()
        formData.append('front_file', frontBlob, `${docType}_front.jpg`)
        
        // Add back image for ID
        if (docType === 'id' && backImage) {
            const backBlob = base64ToBlob(backImage)
            console.log(`📦 Back image size: ${(backBlob.size / 1024).toFixed(2)} KB`)
            formData.append('back_file', backBlob, 'id_back.jpg')
        }

        console.log(`🌐 Sending to: ${API_ENDPOINT}`)

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        })

        console.log(`📡 Response status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('API Error Response:', errorText)
            throw new Error(`API Error: ${response.status} - ${errorText}`)
        }

        // Get the raw response text first
        const responseText = await response.text()
        console.log('📥 Raw API Response:', responseText)
        
        // Parse JSON
        let result
        try {
            result = JSON.parse(responseText)
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError)
            console.error('Response was:', responseText)
            throw new Error('Invalid JSON response from API')
        }
        
        console.log('✅ Parsed JSON:', result)
        console.log('✅ JSON Keys:', Object.keys(result))
        console.log('✅ Full Extraction successful')
        
        // Display extracted data
        displayExtractedData(result)
        
        return result

    } catch (error: any) {
        console.error('❌ API call failed:', error)
        
        // Show detailed error to user
        const captureStatus = document.getElementById('captureStatus')
        if (captureStatus) {
            if (error.message.includes('Failed to fetch')) {
                captureStatus.innerText = '❌ Network error - Check connection'
            } else if (error.message.includes('CORS')) {
                captureStatus.innerText = '❌ CORS error - Check API settings'
            } else {
                captureStatus.innerText = `❌ ${error.message}`
            }
        }
        
        throw error
    }
}

function base64ToBlob(base64: string): Blob {
    const base64Data = base64.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: 'image/jpeg' })
}

function saveImageToServer(imageData: string, docType: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const side = capturedImages.front && !capturedImages.back ? 'back' : 'front'
    const filename = `${docType}_${side}_${timestamp}.jpg`
    
    // Send to local server to save file
    fetch('http://localhost:3001/save-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: imageData,
            filename: filename
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(`💾 Image saved to server: ${data.path}`)
    })
    .catch(error => {
        console.error('❌ Failed to save image to server:', error)
    })
}

function displayExtractedData(data: any) {
    // Log the full response to console
    console.log('📄 Full API Response:', data)
    console.log('📄 Response Type:', typeof data)
    console.log('📄 Response Keys:', Object.keys(data))
    
    // Create a modal or panel to show extracted data
    const existingModal = document.getElementById('extractionModal')
    if (existingModal) {
        existingModal.remove()
    }

    const modal = document.createElement('div')
    modal.id = 'extractionModal'
    modal.className = 'extraction-modal'
    
    // Properly escape JSON for HTML
    const jsonString = JSON.stringify(data, null, 2)
    const escapedJson = jsonString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>✅ Extracted Data</h2>
                <button class="close-btn" id="closeModalBtn">✕</button>
            </div>
            <div class="modal-body">
                <pre id="jsonDisplay">${escapedJson}</pre>
            </div>
            <div class="modal-footer">
                <button class="copy-btn" id="copyJsonBtn">
                    📋 Copy JSON
                </button>
                <button class="close-btn-secondary" id="closeModalBtn2">
                    Close
                </button>
            </div>
        </div>
    `
    
    document.body.appendChild(modal)
    
    // Add event listeners properly
    const closeBtn = document.getElementById('closeModalBtn')
    const closeBtn2 = document.getElementById('closeModalBtn2')
    const copyBtn = document.getElementById('copyJsonBtn')
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.remove())
    }
    
    if (closeBtn2) {
        closeBtn2.addEventListener('click', () => modal.remove())
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(jsonString).then(() => {
                const originalText = copyBtn.innerText
                copyBtn.innerText = '✅ Copied!'
                setTimeout(() => {
                    copyBtn.innerText = originalText
                }, 2000)
            }).catch(err => {
                console.error('Failed to copy:', err)
                alert('Failed to copy to clipboard')
            })
        })
    }
}

// Initialize app
showSelectionScreen()