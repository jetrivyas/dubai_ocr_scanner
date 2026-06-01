# Dubai OCR Scanner

Document scanner with auto-capture for Passport and ID cards.

## Features

- ✨ Auto-capture when document quality is good
- 🛂 Passport scanning (single image)
- 🪪 ID Card scanning (front & back)
- 📁 Automatic image saving to `captures/` folder
- 🔍 Document detection and cropping
- 📊 Real-time quality metrics (blur, brightness, clarity)
- 🌐 API integration for OCR extraction

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start both frontend and backend:**
   ```bash
   npm start
   ```

   This will start:
   - Frontend (Vite): http://localhost:5173
   - Backend (Express): http://localhost:3001

   Or run them separately:
   ```bash
   npm run dev      # Frontend only
   npm run server   # Backend only
   ```

## How It Works

1. **Select Document Type**: Choose Passport or ID Card
2. **Position Document**: Place document inside the green frame
3. **Auto-Capture**: System automatically captures when quality is good
4. **Processing**: Image is saved to `captures/` folder and sent to OCR API
5. **Results**: Extracted data is displayed in a modal

## Quality Thresholds

Auto-capture triggers when:
- Blur Score > 40%
- Brightness > 35%
- Clarity > 15%

## Captured Images

All images are saved to: `captures/`

Filename format: `{type}_{side}_{timestamp}.jpg`

Examples:
- `passport_front_2024-01-15T10-30-45.jpg`
- `id_front_2024-01-15T10-31-20.jpg`
- `id_back_2024-01-15T10-31-25.jpg`

## API Endpoints

- Passport: `https://jumeirah-ai.testyourapp.online/extract_passport`
- ID Card: `https://jumeirah-ai.testyourapp.online/extract_id`

## Tech Stack

- **Frontend**: TypeScript, Vite, OpenCV.js
- **Backend**: Node.js, Express
- **OCR**: Custom API integration
