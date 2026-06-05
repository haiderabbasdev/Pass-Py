// ====================
// DARK MODE LOGIC
// ====================
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

try {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        html.setAttribute('data-theme', 'dark');
    }
} catch (e) {
    console.warn('Theme load failed:', e);
}

themeToggle.addEventListener('click', () => {
    try {
        const isDark = html.getAttribute('data-theme') === 'dark';
        if (isDark) {
            html.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    } catch (e) {
        console.warn('Theme toggle failed:', e);
    }
});

// ====================
// DOM ELEMENTS
// ====================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('inp');
const fileList = document.getElementById('fileList');
const addMoreBtn = document.querySelector('.add-more-btn');
const optToggle = document.getElementById('optToggle');
const optPanel = document.getElementById('optPanel');
const toggleText = document.getElementById('toggleText');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const generateBtn = document.getElementById('generateBtn');
const removeBgCheck = document.getElementById('removeBgCheck');

let files = [];

// ====================
// DRAG & DROP
// ====================
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
});

dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.file-item')) return;
    fileInput.click();
});

dropZone.addEventListener('drop', (e) => {
    try {
        const dt = e.dataTransfer;
        const newFiles = [...dt.files].filter(f => 
            ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        );
        handleFiles(newFiles);
    } catch (err) {
        console.error('Drop failed:', err);
        showToast('Failed to process dropped files');
    }
});

// ====================
// FILE INPUT
// ====================
addMoreBtn.querySelector('button').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    try {
        const newFiles = [...e.target.files].filter(f => 
            ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        );
        handleFiles(newFiles);
        fileInput.value = '';
    } catch (err) {
        console.error('File input failed:', err);
        showToast('Failed to load files');
    }
});

// ====================
// CLIPBOARD PASTE
// ====================
window.addEventListener('paste', (e) => {
    try {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageItems = [];
        for (const item of items) {
            if (item.type.startsWith('image/')) imageItems.push(item);
        }
        if (imageItems.length === 0) return;

        e.preventDefault();
        
        const newFiles = [];
        imageItems.forEach((item, index) => {
            try {
                const blob = item.getAsFile();
                const ext = item.type.split('/')[1] || 'png';
                newFiles.push(new File([blob], `clipboard-${Date.now()}-${index}.${ext}`, {
                    type: item.type,
                    lastModified: Date.now()
                }));
            } catch (err) {
                console.warn('Clipboard item failed:', err);
            }
        });

        if (newFiles.length > 0) {
            handleFiles(newFiles);
            showToast(`Pasted ${newFiles.length} image${newFiles.length > 1 ? 's' : ''}`);
        }
    } catch (err) {
        console.error('Paste failed:', err);
        showToast('Failed to paste from clipboard');
    }
});

// ====================
// FILE HANDLING
// ====================
function handleFiles(newFiles) {
    try {
        if (!newFiles.length) return;
        
        const totalAfterAdd = files.length + newFiles.length;
        if (totalAfterAdd > 3) {
            const allowed = 3 - files.length;
            if (allowed <= 0) {
                showToast('Maximum 3 photos allowed');
                return;
            }
            newFiles = newFiles.slice(0, allowed);
            showToast(`Only ${allowed} more photo${allowed > 1 ? 's' : ''} allowed`);
        }
        
        files = [...files, ...newFiles];
        renderFiles();
        showToast(`${newFiles.length} photo${newFiles.length > 1 ? 's' : ''} added`);
        dropZone.classList.add('has-files');
    } catch (err) {
        console.error('Handle files failed:', err);
        showToast('Failed to add files');
    }
}

function renderFiles() {
    try {
        if (!files.length) {
            fileList.classList.remove('active');
            addMoreBtn.classList.remove('active');
            dropZone.classList.remove('has-files');
            return;
        }

        fileList.innerHTML = files.map((file, i) => `
            <div class="file-item">
                <div class="file-thumb">
                    <img src="${URL.createObjectURL(file)}" alt="${file.name}" 
                         style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
                    <div class="crop-overlay">
                        <i class="ri-scissors-cut-line"></i>
                        <span>Crop</span>
                    </div>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${(file.size / 1024 / 1024).toFixed(1)} MB</div>
                    <div class="copy-select">
                        <label>Copies:</label>
                        <select class="copy-count" data-index="${i}">
                            <option value="4">4</option>
                            <option value="6" selected>6</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="16">16</option>
                            <option value="24">24</option>
                        </select>
                    </div>
                </div>
                <button class="file-remove" onclick="removeFile(${i})" aria-label="Remove file">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        `).join('');

        fileList.classList.add('active');
        
        if (files.length >= 3) {
            addMoreBtn.classList.add('hidden');
        } else {
            addMoreBtn.classList.remove('hidden');
            addMoreBtn.classList.add('active');
        }
    } catch (err) {
        console.error('Render failed:', err);
        showToast('Failed to display files');
    }
}

function removeFile(index) {
    try {
        files.splice(index, 1);
        renderFiles();
    } catch (err) {
        console.error('Remove failed:', err);
        showToast('Failed to remove file');
    }
}

// ====================
// CROP FUNCTIONALITY
// ====================
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const cropClose = document.getElementById('cropClose');
const cropCancel = document.getElementById('cropCancel');
const cropApply = document.getElementById('cropApply');

let cropper = null;
let currentCropIndex = null;

fileList.addEventListener('click', (e) => {
    try {
        const thumb = e.target.closest('.file-thumb');
        if (!thumb) return;
        
        const fileItem = thumb.closest('.file-item');
        const index = Array.from(fileList.children).indexOf(fileItem);
        
        if (index !== -1 && files[index]) {
            openCropper(index);
        }
    } catch (err) {
        console.error('Crop click failed:', err);
    }
});

function openCropper(index) {
    try {
        currentCropIndex = index;
        const file = files[index];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                cropImage.src = e.target.result;
                cropModal.classList.add('open');
                
                cropImage.onload = () => {
                    try {
                        if (cropper) cropper.destroy();
                        cropper = new Cropper(cropImage, {
                            aspectRatio: NaN,
                            viewMode: 1,
                            autoCropArea: 1,
                            responsive: true,
                            guides: true,
                            center: true,
                            highlight: false,
                            background: false,
                        });
                    } catch (err) {
                        console.error('Cropper init failed:', err);
                        showToast('Failed to load cropper');
                    }
                };
            } catch (err) {
                console.error('Crop image load failed:', err);
            }
        };
        
        reader.onerror = (err) => {
            console.error('FileReader failed:', err);
            showToast('Failed to read image');
        };
        
        reader.readAsDataURL(file);
    } catch (err) {
        console.error('Open cropper failed:', err);
        showToast('Failed to open cropper');
    }
}

function closeCropper() {
    try {
        cropModal.classList.remove('open');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        currentCropIndex = null;
    } catch (err) {
        console.warn('Close cropper failed:', err);
    }
}

cropClose.addEventListener('click', closeCropper);
cropCancel.addEventListener('click', closeCropper);

cropApply.addEventListener('click', () => {
    try {
        if (!cropper || currentCropIndex === null) return;
        
        const canvas = cropper.getCroppedCanvas();
        
        canvas.toBlob((blob) => {
            try {
                const originalFile = files[currentCropIndex];
                const croppedFile = new File([blob], `cropped_${originalFile.name}`, {
                    type: originalFile.type,
                    lastModified: Date.now()
                });
                
                files[currentCropIndex] = croppedFile;
                renderFiles();
                closeCropper();
                showToast('Photo cropped!');
            } catch (err) {
                console.error('Crop blob failed:', err);
                showToast('Failed to apply crop');
            }
        }, files[currentCropIndex].type, 0.9);
    } catch (err) {
        console.error('Crop apply failed:', err);
        showToast('Failed to crop photo');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cropModal.classList.contains('open')) {
        closeCropper();
    }
});

cropModal.addEventListener('click', (e) => {
    if (e.target === cropModal) closeCropper();
});

// ====================
// ADVANCED OPTIONS
// ====================
optToggle.addEventListener('click', () => {
    try {
        const isOpen = optPanel.classList.contains('open');
        if (isOpen) {
            optPanel.classList.remove('open');
            optToggle.classList.remove('open');
            toggleText.textContent = 'Advanced Options';
        } else {
            optPanel.classList.add('open');
            optToggle.classList.add('open');
            toggleText.textContent = 'Hide Advanced Options';
        }
    } catch (err) {
        console.warn('Toggle failed:', err);
    }
});

// ====================
// TOAST
// ====================
function showToast(msg) {
    try {
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    } catch (err) {
        console.error('Toast failed:', err);
        try { alert(msg); } catch (e) {}
    }
}

// ====================
// GENERATE
// ====================
generateBtn.addEventListener('click', async () => {
    try {
        if (!files.length) {
            showToast('Upload some photos first');
            shakeElement(dropZone);
            return;
        }

        const removeBg = removeBgCheck?.checked ?? false;
        const originalText = generateBtn.innerHTML;
        
        try {
            generateBtn.innerHTML = '<i class="ri-loader-2-line spinning"></i> Processing...';
            generateBtn.disabled = true;
        } catch (err) {
            console.warn('Button update failed:', err);
        }

        // Step 1: Remove backgrounds if checked
        let processedFiles = [...files];
        
        if (removeBg) {
            for (let i = 0; i < files.length; i++) {
                try {
                    generateBtn.innerHTML = `<i class="ri-loader-2-line spinning"></i> Removing background (${i + 1}/${files.length})...`;
                    
                    const bgFormData = new FormData();
                    bgFormData.append('image', files[i]);
                    
                    const bgResponse = await fetch('/api/remove-bg', {
                        method: 'POST',
                        body: bgFormData
                    });
                    
                    if (bgResponse.status === 429) {
                        const retryAfter = bgResponse.headers.get('Retry-After') || '15';
                        const errorData = await bgResponse.json().catch(() => ({}));
                        throw new Error(errorData.details || `Rate limit: BG removal. Retry after ${retryAfter} min.`);
                    }
                    
                    if (bgResponse.ok) {
                        const blob = await bgResponse.blob();
                        processedFiles[i] = new File([blob], `nobg_${files[i].name}`, {
                            type: 'image/png'
                        });
                    } else {
                        console.warn('BG removal failed for file', i, '- using original');
                    }
                } catch (err) {
                    if (err.message.includes('Rate limit')) throw err;
                    console.warn('BG removal error for file', i, '- using original');
                }
            }
        }

        // Step 2: Generate PDF
        try {
            generateBtn.innerHTML = '<i class="ri-loader-2-line spinning"></i> Generating PDF...';
        } catch (err) {
            console.warn('Button update failed:', err);
        }

        const formData = new FormData();
        
        processedFiles.forEach((file, index) => {
            try {
                formData.append('images', file);
            } catch (err) {
                console.warn('File append failed:', err);
            }
        });
        
        try {
            const copySelects = document.querySelectorAll('.copy-count');
            const copies = Array.from(copySelects).map(select => select.value);
            formData.append('copies', JSON.stringify(copies));
        } catch (err) {
            console.warn('Copies collection failed:', err);
            formData.append('copies', JSON.stringify([6, 6, 6]));
        }
        
        try {
            const width = document.getElementById('width').value;
            const height = document.getElementById('height').value;
            const spacing = document.getElementById('spacing').value;
            const border = document.getElementById('border').value;
            
            if (width) formData.append('width', width);
            if (height) formData.append('height', height);
            if (spacing) formData.append('spacing', spacing);
            if (border) formData.append('border', border);
        } catch (err) {
            console.warn('Options collection failed:', err);
        }
        
        formData.append('photoType', 'passport');
        formData.append('removeBg', removeBg ? 'true' : 'false');
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData
        });
        
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || '15';
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || `Rate limit reached. Retry after ${retryAfter} minutes.`);
        }
        
        if (response.status === 413) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'File too large. Maximum 50MB per file.');
        }
        
        if (response.status === 415) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'Invalid file type. Only JPG, PNG, WEBP allowed.');
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Generation failed' }));
            throw new Error(error.details || error.error || `Server error: ${response.status}`);
        }
        
        try {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pass-py-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            showToast('Print sheet downloaded!');
        } catch (err) {
            console.error('Download failed:', err);
            throw new Error('Failed to download PDF. Please try again.');
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        
        try {
            if (error.message.toLowerCase().includes('rate limit')) {
                showToast(`${error.message}`);
            } else if (error.message.includes('timed out')) {
                showToast(`${error.message}`);
            } else {
                showToast(`${error.message}`);
            }
            shakeElement(generateBtn);
        } catch (err) {
            console.error('Error display failed:', err);
            alert('An error occurred. Please refresh and try again.');
        }
        
    } finally {
        try {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        } catch (err) {
            console.warn('Button reset failed:', err);
        }
    }
});

function shakeElement(el) {
    try {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'shake 0.5s ease';
    } catch (err) {
        console.warn('Shake failed:', err);
    }
}

// ====================
// KEYFRAMES
// ====================
try {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes fadeSlide {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
} catch (e) {
    console.error('Keyframes failed:', e);
}

// ====================
// GLOBAL ERROR HANDLERS
// ====================
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('Something went wrong. Please refresh the page.');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    showToast('Network error. Please check your connection.');
});