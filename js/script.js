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
    console.warn('Failed to load theme preference:', e);
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
        console.warn('Failed to toggle theme:', e);
    }
});

// ====================
// DOM ELEMENTS
// ====================
let dropZone, fileInput, fileList, addMoreBtn, optToggle, optPanel, toggleText, toast, toastMsg, generateBtn, removeBgCheck;

try {
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('inp');
    fileList = document.getElementById('fileList');
    addMoreBtn = document.querySelector('.add-more-btn');
    optToggle = document.getElementById('optToggle');
    optPanel = document.getElementById('optPanel');
    toggleText = document.getElementById('toggleText');
    toast = document.getElementById('toast');
    toastMsg = document.getElementById('toastMsg');
    generateBtn = document.getElementById('generateBtn');
    removeBgCheck = document.getElementById('removeBgCheck');
} catch (e) {
    console.error('Failed to initialize DOM elements:', e);
}

let files = [];

// ====================
// DRAG & DROP
// ====================
try {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        try {
            e.preventDefault();
            e.stopPropagation();
        } catch (err) {
            console.warn('Prevent defaults failed:', err);
        }
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            try {
                dropZone.classList.add('drag-active');
            } catch (e) {
                console.warn('Drag active failed:', e);
            }
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            try {
                dropZone.classList.remove('drag-active');
            } catch (e) {
                console.warn('Drag remove failed:', e);
            }
        }, false);
    });

    dropZone.addEventListener('click', (e) => {
        try {
            if (e.target.closest('.file-item')) return;
            fileInput.click();
        } catch (err) {
            console.warn('Drop zone click failed:', err);
        }
    });

    dropZone.addEventListener('drop', (e) => {
        try {
            const dt = e.dataTransfer;
            const newFiles = [...dt.files].filter(f => 
                ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
            );
            handleFiles(newFiles);
        } catch (err) {
            console.error('Drop handler failed:', err);
            showToast('Failed to process dropped files');
        }
    });
} catch (e) {
    console.error('Drag and drop initialization failed:', e);
}

// ====================
// FILE INPUT
// ====================
try {
    addMoreBtn.querySelector('button').addEventListener('click', () => {
        try {
            fileInput.click();
        } catch (err) {
            console.warn('Add more click failed:', err);
        }
    });

    fileInput.addEventListener('change', (e) => {
        try {
            const newFiles = [...e.target.files].filter(f => 
                ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
            );
            handleFiles(newFiles);
            fileInput.value = '';
        } catch (err) {
            console.error('File input change failed:', err);
            showToast('Failed to load files');
        }
    });
} catch (e) {
    console.error('File input initialization failed:', e);
}

// ====================
// CLIPBOARD PASTE (Ctrl+V)
// ====================
try {
    window.addEventListener('paste', (e) => {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageItems = [];
            
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    imageItems.push(item);
                }
            }

            if (imageItems.length === 0) return;

            e.preventDefault();
            
            const newFiles = [];
            
            imageItems.forEach((item, index) => {
                try {
                    const blob = item.getAsFile();
                    const extension = item.type.split('/')[1] || 'png';
                    const file = new File([blob], `clipboard-${Date.now()}-${index}.${extension}`, {
                        type: item.type,
                        lastModified: Date.now()
                    });
                    newFiles.push(file);
                } catch (err) {
                    console.warn('Clipboard item processing failed:', err);
                }
            });

            if (newFiles.length > 0) {
                handleFiles(newFiles);
                showToast(`Pasted ${newFiles.length} image${newFiles.length > 1 ? 's' : ''} from clipboard`);
            }
        } catch (err) {
            console.error('Paste handler failed:', err);
            showToast('Failed to paste from clipboard');
        }
    });
} catch (e) {
    console.error('Clipboard initialization failed:', e);
}

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
            showToast(`Only ${allowed} more photo${allowed > 1 ? 's' : ''} allowed (max 3)`);
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

        fileList.innerHTML = files.map((file, i) => {
            try {
                return `
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
                `;
            } catch (err) {
                console.warn('File item render failed:', err);
                return '';
            }
        }).join('');

        fileList.classList.add('active');
        
        if (files.length >= 3) {
            addMoreBtn.classList.add('hidden');
        } else {
            addMoreBtn.classList.remove('hidden');
            addMoreBtn.classList.add('active');
        }
    } catch (err) {
        console.error('Render files failed:', err);
        showToast('Failed to display files');
    }
}

function removeFile(index) {
    try {
        files.splice(index, 1);
        renderFiles();
    } catch (err) {
        console.error('Remove file failed:', err);
        showToast('Failed to remove file');
    }
}

// ====================
// CROP FUNCTIONALITY
// ====================
let cropModal, cropImage, cropClose, cropCancel, cropApply;
let cropper = null;
let currentCropIndex = null;

try {
    cropModal = document.getElementById('cropModal');
    cropImage = document.getElementById('cropImage');
    cropClose = document.getElementById('cropClose');
    cropCancel = document.getElementById('cropCancel');
    cropApply = document.getElementById('cropApply');

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
            console.error('Crop click handler failed:', err);
        }
    });

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
                    console.error('Crop blob processing failed:', err);
                    showToast('Failed to apply crop');
                }
            }, files[currentCropIndex].type, 0.9);
        } catch (err) {
            console.error('Crop apply failed:', err);
            showToast('Failed to crop photo');
        }
    });

    document.addEventListener('keydown', (e) => {
        try {
            if (e.key === 'Escape' && cropModal.classList.contains('open')) {
                closeCropper();
            }
        } catch (err) {
            console.warn('Escape key handler failed:', err);
        }
    });

    cropModal.addEventListener('click', (e) => {
        try {
            if (e.target === cropModal) {
                closeCropper();
            }
        } catch (err) {
            console.warn('Crop modal click failed:', err);
        }
    });
} catch (e) {
    console.error('Crop functionality initialization failed:', e);
}

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
                        console.error('Cropper initialization failed:', err);
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

// ====================
// ADVANCED OPTIONS TOGGLE
// ====================
try {
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
            console.warn('Options toggle failed:', err);
        }
    });
} catch (e) {
    console.error('Options toggle initialization failed:', e);
}

// ====================
// TOAST
// ====================
function showToast(msg) {
    try {
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            try {
                toast.classList.remove('show');
            } catch (err) {
                console.warn('Toast hide failed:', err);
            }
        }, 2800);
    } catch (err) {
        console.error('Show toast failed:', err);
        // Fallback to alert if toast is completely broken
        try {
            alert(msg);
        } catch (e) {
            console.error('Alert fallback failed:', e);
        }
    }
}

// ====================
// RATE LIMIT HELPER
// ====================
function handleRateLimit(response) {
    try {
        const retryAfter = response.headers.get('Retry-After') || 
                           response.headers.get('ratelimit-reset') || 
                           '15';
        const remaining = response.headers.get('RateLimit-Remaining');
        return { retryAfter, remaining };
    } catch (err) {
        console.warn('Rate limit header parsing failed:', err);
        return { retryAfter: '15', remaining: null };
    }
}

// ====================
// FETCH WITH TIMEOUT & RETRY
// ====================
async function fetchWithTimeout(url, options = {}, timeout = 30000, retries = 1) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        
        if (retries > 0) {
            console.log(`Retrying fetch... ${retries} attempts left`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithTimeout(url, options, timeout, retries - 1);
        }
        
        throw err;
    }
}

// ====================
// GENERATE PRINT SHEET
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
            console.warn('Button state update failed:', err);
        }

        let processedFiles = [...files];
        
        // Background removal if checked
        if (removeBg) {
            for (let i = 0; i < files.length; i++) {
                try {
                    generateBtn.innerHTML = `<i class="ri-loader-2-line spinning"></i> Removing background (${i + 1}/${files.length})...`;
                    
                    const formData = new FormData();
                    formData.append('image', files[i]);
                    
                    const bgResponse = await fetchWithTimeout('/api/remove-bg', {
                        method: 'POST',
                        body: formData
                    }, 60000); // 60s timeout for BG removal
                    
                    // Handle rate limit for BG removal
                    if (bgResponse.status === 429) {
                        const { retryAfter } = handleRateLimit(bgResponse);
                        const errorData = await bgResponse.json().catch(() => ({}));
                        throw new Error(errorData.details || `Rate limit: Background removal. Retry after ${retryAfter} minutes.`);
                    }
                    
                    // Handle file size error
                    if (bgResponse.status === 413) {
                        const errorData = await bgResponse.json().catch(() => ({}));
                        throw new Error(errorData.details || 'File too large for background removal.');
                    }
                    
                    if (bgResponse.ok) {
                        try {
                            const blob = await bgResponse.blob();
                            processedFiles[i] = new File([blob], `nobg_${files[i].name}`, {
                                type: 'image/png'
                            });
                        } catch (err) {
                            console.warn('BG removal blob processing failed:', err);
                            // Keep original file on failure
                        }
                    } else {
                        console.warn('BG removal failed for file', i, '- keeping original');
                    }
                } catch (err) {
                    if (err.message.includes('Rate limit') || err.message.includes('timed out')) {
                        throw err; // Re-throw critical errors
                    }
                    console.warn('BG removal for file', i, 'failed:', err);
                    // Continue with original file
                }
            }
        }
        
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
                console.warn('Failed to append file', index, 'to form data:', err);
            }
        });
        
        try {
            const copySelects = document.querySelectorAll('.copy-count');
            const copies = Array.from(copySelects).map(select => select.value);
            formData.append('copies', JSON.stringify(copies));
        } catch (err) {
            console.warn('Copy count collection failed:', err);
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
            console.warn('Advanced options collection failed:', err);
        }
        
        formData.append('photoType', 'passport');
        formData.append('removeBg', removeBg ? 'true' : 'false');
        
        const response = await fetchWithTimeout('/api/generate', {
            method: 'POST',
            body: formData
        }, 120000); // 120s timeout for PDF generation
        
        // Handle rate limit for generation
        if (response.status === 429) {
            const { retryAfter } = handleRateLimit(response);
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || `Rate limit reached. Retry after ${retryAfter} minutes.`);
        }
        
        // Handle file size / count errors
        if (response.status === 413) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'File too large. Maximum 50MB per file.');
        }
        
        if (response.status === 415) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'Invalid file type. Only JPG, PNG, WEBP allowed.');
        }
        
        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'Bad request. Please check your inputs.');
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Generation failed' }));
            throw new Error(error.details || error.error || `Server error: ${response.status}`);
        }
        
        // Check remaining rate limit
        try {
            const { remaining } = handleRateLimit(response);
            if (remaining && parseInt(remaining) < 3) {
                showToast(`⚠️ ${remaining} generations remaining this window`);
            }
        } catch (err) {
            console.warn('Rate limit warning failed:', err);
        }
        
        // Download PDF
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
            dropZone.classList.add('has-files');
        } catch (err) {
            console.error('PDF download failed:', err);
            throw new Error('Failed to download PDF. Please try again.');
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        
        try {
            // Check if it's a rate limit error
            if (error.message.toLowerCase().includes('rate limit') || 
                error.message.toLowerCase().includes('too many')) {
                showToast(`⏳ ${error.message}`);
            } else if (error.message.includes('timed out')) {
                showToast(`⏳ ${error.message}`);
            } else {
                showToast(`❌ ${error.message}`);
            }
            
            shakeElement(generateBtn);
        } catch (err) {
            console.error('Error handling failed:', err);
            alert('An error occurred. Please refresh the page and try again.');
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
        console.warn('Shake animation failed:', err);
    }
}

// ====================
// KEYFRAME INJECTION
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
    console.error('Keyframe injection failed:', e);
}

// ====================
// GLOBAL ERROR HANDLER
// ====================
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('Something went wrong. Please refresh the page.');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('Network error. Please check your connection.');
});