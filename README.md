# Pass-Py

AI-powered passport photo maker for Indian print shops. Upload, crop, remove background, print — done in seconds.

## Features

- Multi-photo upload (max 3)
- AI background removal (offline, no internet needed)
- Smart grid layout (A4, 300 DPI)
- Custom size, spacing, and border
- Crop tool with live preview
- Dark/light mode
- Ctrl+V paste from clipboard
- Instant PDF download

## Tech Stack

- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js, Express
- Image Processing: Sharp, rembg (AI)
- PDF Generation: PDFKit
- Crop Tool: Cropper.js

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/pass-py.git
cd pass-py

# Install Node dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Start server
node server.js