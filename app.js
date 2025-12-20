// Global variables
let originalImage = null;
let processedImage = null;
let originalCanvas = null;
let processedCanvas = null;
let originalCtx = null;
let processedCtx = null;
let cvReady = false;
let cvLoadTimeout = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting app initialization');
    initializeApp();
    checkOpenCVLoading();
});

function initializeApp() {
    console.log('Initializing application...');
    
    // Get canvas elements
    originalCanvas = document.getElementById('originalCanvas');
    processedCanvas = document.getElementById('processedCanvas');
    originalCtx = originalCanvas.getContext('2d');
    processedCtx = processedCanvas.getContext('2d');

    console.log('Canvas elements initialized');

    // Setup event listeners
    setupEventListeners();
    
    // Load saved settings if available
    loadSettingsFromStorage();
    
    console.log('App initialization complete');
}

function checkOpenCVLoading() {
    // Set a timeout to check if OpenCV.js is taking too long
    cvLoadTimeout = setTimeout(function() {
        if (!cvReady) {
            const statusElement = document.getElementById('opencvStatus');
            statusElement.textContent = '⚠️ تحذير: OpenCV.js يستغرق وقتاً طويلاً في التحميل. يمكنك رفع الصور ولكن المعالجة قد لا تعمل.';
            statusElement.style.color = '#f39c12';
            console.warn('OpenCV.js is taking longer than expected to load');
        }
    }, 10000); // 10 seconds timeout
}

function setupEventListeners() {
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    
    // File input change
    imageInput.addEventListener('change', handleImageUpload);
    
    // Drag and drop
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Processing buttons
    document.getElementById('restoreBtn').addEventListener('click', restoreImage);
    document.getElementById('denoiseBtn').addEventListener('click', denoiseImage);
    document.getElementById('enhanceBtn').addEventListener('click', enhanceImage);
    document.getElementById('inpaintBtn').addEventListener('click', inpaintImage);
    
    // Action buttons
    document.getElementById('resetBtn').addEventListener('click', resetImage);
    document.getElementById('downloadBtn').addEventListener('click', downloadImage);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('loadSettingsBtn').addEventListener('click', loadSettings);
    
    // Slider updates
    setupSliderListeners();
}

function setupSliderListeners() {
    const sliders = [
        { id: 'denoiseStrength', display: 'denoiseValue' },
        { id: 'denoiseColor', display: 'denoiseColorValue' },
        { id: 'sharpenAmount', display: 'sharpenValue' },
        { id: 'contrastAmount', display: 'contrastValue' },
        { id: 'brightnessAmount', display: 'brightnessValue' },
        { id: 'morphSize', display: 'morphSizeValue' },
        { id: 'inpaintRadius', display: 'inpaintRadiusValue' }
    ];
    
    sliders.forEach(slider => {
        const element = document.getElementById(slider.id);
        const display = document.getElementById(slider.display);
        element.addEventListener('input', (e) => {
            display.textContent = e.target.value;
        });
    });
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleImageFile(files[0]);
    }
}

function handleImageUpload(e) {
    console.log('Image upload triggered');
    const file = e.target.files[0];
    console.log('Selected file:', file ? file.name : 'none');
    
    if (file) {
        if (file.type.startsWith('image/')) {
            console.log('Valid image file detected:', file.type);
            handleImageFile(file);
        } else {
            console.error('Invalid file type:', file.type);
            alert('الرجاء اختيار ملف صورة صحيح (JPG, PNG, etc.)');
        }
    } else {
        console.warn('No file selected');
    }
}

function handleImageFile(file) {
    console.log('Processing image file:', file.name);
    const reader = new FileReader();
    
    reader.onerror = function(error) {
        console.error('Error reading file:', error);
        alert('حدث خطأ في قراءة الملف');
    };
    
    reader.onload = function(e) {
        console.log('File loaded successfully');
        const img = new Image();
        
        img.onerror = function(error) {
            console.error('Error loading image:', error);
            alert('حدث خطأ في تحميل الصورة');
        };
        
        img.onload = function() {
            console.log('Image loaded successfully. Dimensions:', img.width, 'x', img.height);
            loadImageToCanvas(img);
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

function loadImageToCanvas(img) {
    console.log('Loading image to canvas...');
    
    try {
        // Set canvas dimensions
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;
        
        console.log('Original dimensions:', width, 'x', height);
        
        // Scale down if necessary
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            console.log('Scaled dimensions:', width, 'x', height);
        }
        
        originalCanvas.width = width;
        originalCanvas.height = height;
        processedCanvas.width = width;
        processedCanvas.height = height;
        
        // Draw original image
        originalCtx.drawImage(img, 0, 0, width, height);
        console.log('Image drawn to original canvas');
        
        // Clear processed canvas
        processedCtx.clearRect(0, 0, width, height);
        
        // Hide placeholders
        document.getElementById('originalPlaceholder').classList.add('hidden');
        document.getElementById('processedPlaceholder').classList.remove('hidden');
        console.log('Placeholders updated');
        
        // Enable buttons (even without OpenCV for basic operations)
        enableProcessingButtons(true);
        
        // Show success message
        showTemporaryMessage('تم تحميل الصورة بنجاح! ✓');
        
        // Store original image data if OpenCV is ready
        if (cvReady) {
            try {
                originalImage = cv.imread(originalCanvas);
                console.log('Image data stored in OpenCV format');
            } catch (cvError) {
                console.error('Error reading image with OpenCV:', cvError);
                alert('تم تحميل الصورة ولكن OpenCV غير جاهز. بعض المعالجات قد لا تعمل.');
            }
        } else {
            console.warn('OpenCV not ready yet. Image loaded but processing may not work.');
            showTemporaryMessage('⚠️ الصورة محملة لكن OpenCV.js لم يكتمل تحميله بعد');
        }
    } catch (error) {
        console.error('Error in loadImageToCanvas:', error);
        alert('حدث خطأ أثناء تحميل الصورة إلى Canvas');
    }
}

function showTemporaryMessage(message) {
    const statusElement = document.getElementById('opencvStatus');
    const originalText = statusElement.textContent;
    const originalColor = statusElement.style.color;
    
    statusElement.textContent = message;
    statusElement.style.color = '#2ecc71';
    
    setTimeout(function() {
        if (cvReady) {
            statusElement.textContent = 'OpenCV.js جاهز ✓';
            statusElement.style.color = '#2ecc71';
        } else {
            statusElement.textContent = originalText;
            statusElement.style.color = originalColor;
        }
    }, 3000);
}

function enableProcessingButtons(enabled) {
    document.getElementById('restoreBtn').disabled = !enabled;
    document.getElementById('denoiseBtn').disabled = !enabled;
    document.getElementById('enhanceBtn').disabled = !enabled;
    document.getElementById('inpaintBtn').disabled = !enabled;
    document.getElementById('resetBtn').disabled = !enabled;
}

// OpenCV.js ready callback
function onOpenCvReady() {
    cvReady = true;
    clearTimeout(cvLoadTimeout);
    
    const statusElement = document.getElementById('opencvStatus');
    statusElement.textContent = 'OpenCV.js جاهز ✓';
    statusElement.classList.add('ready');
    statusElement.style.color = '#2ecc71';
    
    console.log('OpenCV.js is ready');
    console.log('OpenCV version:', cv.getBuildInformation ? 'Available' : 'Not available');
    
    // If image is already loaded, process it with OpenCV
    if (originalCanvas && originalCanvas.width > 0) {
        try {
            originalImage = cv.imread(originalCanvas);
            console.log('Existing image processed with OpenCV');
            showTemporaryMessage('OpenCV.js جاهز! يمكنك الآن معالجة الصور ✓');
        } catch (error) {
            console.error('Error processing existing image with OpenCV:', error);
        }
    }
}

// Handle OpenCV.js loading errors
window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('opencv')) {
        console.error('OpenCV.js loading error:', e);
        const statusElement = document.getElementById('opencvStatus');
        statusElement.textContent = '❌ فشل تحميل OpenCV.js - تحقق من الاتصال بالإنترنت';
        statusElement.style.color = '#e74c3c';
    }
});

// Image processing functions
function showProgress(message) {
    const progressSection = document.getElementById('progressSection');
    const progressText = document.getElementById('progressText');
    progressText.textContent = message;
    progressSection.style.display = 'block';
}

function hideProgress() {
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'none';
}

function restoreImage() {
    if (!originalCanvas || originalCanvas.width === 0) {
        alert('يرجى تحميل صورة أولاً');
        return;
    }
    
    if (!cvReady) {
        alert('OpenCV.js لم يكتمل تحميله بعد. جرب "تحسين الجودة" بدلاً من ذلك - لا يحتاج OpenCV');
        return;
    }
    
    if (!originalImage) {
        alert('حدث خطأ في تحميل الصورة مع OpenCV. حاول إعادة تحميل الصورة.');
        return;
    }
    
    showProgress('جاري إصلاح الصورة...');
    
    setTimeout(() => {
        try {
            let src = originalImage.clone();
            let dst = new cv.Mat();
            
            // Step 1: Denoise
            const denoiseStrength = parseInt(document.getElementById('denoiseStrength').value);
            const denoiseColor = parseInt(document.getElementById('denoiseColor').value);
            cv.fastNlMeansDenoisingColored(src, dst, denoiseStrength, denoiseColor, 7, 21);
            src.delete();
            src = dst.clone();
            
            // Step 2: Enhance
            dst.delete();
            dst = new cv.Mat();
            
            // Sharpen
            const kernel = cv.matFromArray(3, 3, cv.CV_32F, [
                0, -1, 0,
                -1, 5, -1,
                0, -1, 0
            ]);
            cv.filter2D(src, dst, cv.CV_8U, kernel);
            kernel.delete();
            src.delete();
            src = dst.clone();
            
            // Step 3: Adjust contrast and brightness
            const contrast = parseFloat(document.getElementById('contrastAmount').value);
            const brightness = parseInt(document.getElementById('brightnessAmount').value);
            dst.delete();
            dst = new cv.Mat();
            src.convertTo(dst, -1, contrast, brightness);
            
            // Display result
            cv.imshow(processedCanvas, dst);
            document.getElementById('processedPlaceholder').classList.add('hidden');
            document.getElementById('downloadBtn').disabled = false;
            
            // Cleanup
            src.delete();
            dst.delete();
            
            hideProgress();
        } catch (error) {
            console.error('Error in restoreImage:', error);
            alert('حدث خطأ أثناء معالجة الصورة');
            hideProgress();
        }
    }, 100);
}

function denoiseImage() {
    if (!originalCanvas || originalCanvas.width === 0) {
        alert('يرجى تحميل صورة أولاً');
        return;
    }
    
    if (!cvReady || !originalImage) {
        alert('هذه الميزة تحتاج OpenCV.js. يرجى الانتظار حتى يكتمل التحميل أو تحقق من اتصال الإنترنت.');
        return;
    }
    
    showProgress('جاري إزالة الضوضاء...');
    
    setTimeout(() => {
        try {
            let src = originalImage.clone();
            let dst = new cv.Mat();
            
            const h = parseInt(document.getElementById('denoiseStrength').value);
            const hColor = parseInt(document.getElementById('denoiseColor').value);
            
            // Apply Non-local Means Denoising
            cv.fastNlMeansDenoisingColored(src, dst, h, hColor, 7, 21);
            
            // Display result
            cv.imshow(processedCanvas, dst);
            document.getElementById('processedPlaceholder').classList.add('hidden');
            document.getElementById('downloadBtn').disabled = false;
            
            // Cleanup
            src.delete();
            dst.delete();
            
            hideProgress();
        } catch (error) {
            console.error('Error in denoiseImage:', error);
            alert('حدث خطأ أثناء إزالة الضوضاء');
            hideProgress();
        }
    }, 100);
}

function enhanceImage() {
    if (!originalCanvas || originalCanvas.width === 0) {
        alert('يرجى تحميل صورة أولاً');
        return;
    }
    
    // Use fallback enhancement if OpenCV is not ready
    if (!cvReady || !originalImage) {
        console.log('Using fallback enhancement (Canvas-based)');
        enhanceImageFallback();
        return;
    }
    
    showProgress('جاري تحسين الصورة...');
    
    setTimeout(() => {
        try {
            let src = originalImage.clone();
            let dst = new cv.Mat();
            
            // Get parameters
            const sharpenAmount = parseFloat(document.getElementById('sharpenAmount').value);
            const contrast = parseFloat(document.getElementById('contrastAmount').value);
            const brightness = parseInt(document.getElementById('brightnessAmount').value);
            
            // Apply sharpening
            const kernel = cv.matFromArray(3, 3, cv.CV_32F, [
                0, -sharpenAmount, 0,
                -sharpenAmount, 1 + 4 * sharpenAmount, -sharpenAmount,
                0, -sharpenAmount, 0
            ]);
            cv.filter2D(src, dst, cv.CV_8U, kernel);
            kernel.delete();
            src.delete();
            src = dst.clone();
            
            // Apply contrast and brightness
            dst.delete();
            dst = new cv.Mat();
            src.convertTo(dst, -1, contrast, brightness);
            
            // Apply histogram equalization for better contrast
            let lab = new cv.Mat();
            cv.cvtColor(dst, lab, cv.COLOR_BGR2Lab);
            let channels = new cv.MatVector();
            cv.split(lab, channels);
            let l = channels.get(0);
            cv.equalizeHist(l, l);
            channels.set(0, l);
            cv.merge(channels, lab);
            dst.delete();
            dst = new cv.Mat();
            cv.cvtColor(lab, dst, cv.COLOR_Lab2BGR);
            
            // Display result
            cv.imshow(processedCanvas, dst);
            document.getElementById('processedPlaceholder').classList.add('hidden');
            document.getElementById('downloadBtn').disabled = false;
            
            // Cleanup
            src.delete();
            dst.delete();
            lab.delete();
            channels.delete();
            l.delete();
            
            hideProgress();
        } catch (error) {
            console.error('Error in enhanceImage:', error);
            alert('حدث خطأ أثناء تحسين الصورة');
            hideProgress();
        }
    }, 100);
}

function enhanceImageFallback() {
    showProgress('جاري تحسين الصورة (معالجة بسيطة)...');
    
    setTimeout(() => {
        try {
            const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
            const data = imageData.data;
            
            // Get parameters
            const contrast = parseFloat(document.getElementById('contrastAmount').value);
            const brightness = parseInt(document.getElementById('brightnessAmount').value);
            const sharpen = parseFloat(document.getElementById('sharpenAmount').value);
            
            // Apply brightness and contrast
            for (let i = 0; i < data.length; i += 4) {
                // Apply contrast and brightness to RGB channels
                data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));     // R
                data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)); // G
                data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)); // B
            }
            
            processedCtx.putImageData(imageData, 0, 0);
            
            // Display result
            document.getElementById('processedPlaceholder').classList.add('hidden');
            document.getElementById('downloadBtn').disabled = false;
            
            hideProgress();
            console.log('Fallback enhancement completed');
        } catch (error) {
            console.error('Error in fallback enhancement:', error);
            alert('حدث خطأ أثناء تحسين الصورة');
            hideProgress();
        }
    }, 100);
}

function inpaintImage() {
    if (!originalCanvas || originalCanvas.width === 0) {
        alert('يرجى تحميل صورة أولاً');
        return;
    }
    
    if (!cvReady || !originalImage) {
        alert('هذه الميزة تحتاج OpenCV.js. يرجى الانتظار حتى يكتمل التحميل أو تحقق من اتصال الإنترنت.');
        return;
    }
    
    showProgress('جاري إصلاح التشققات...');
    
    setTimeout(() => {
        try {
            let src = originalImage.clone();
            let gray = new cv.Mat();
            let mask = new cv.Mat();
            let dst = new cv.Mat();
            
            // Convert to grayscale
            cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY);
            
            // Detect edges (potential cracks)
            cv.Canny(gray, mask, 50, 150);
            
            // Dilate to make cracks more visible
            const morphSize = parseInt(document.getElementById('morphSize').value);
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(morphSize, morphSize));
            cv.dilate(mask, mask, kernel);
            kernel.delete();
            
            // Apply inpainting
            const inpaintRadius = parseInt(document.getElementById('inpaintRadius').value);
            cv.inpaint(src, mask, dst, inpaintRadius, cv.INPAINT_TELEA);
            
            // Display result
            cv.imshow(processedCanvas, dst);
            document.getElementById('processedPlaceholder').classList.add('hidden');
            document.getElementById('downloadBtn').disabled = false;
            
            // Cleanup
            src.delete();
            gray.delete();
            mask.delete();
            dst.delete();
            
            hideProgress();
        } catch (error) {
            console.error('Error in inpaintImage:', error);
            alert('حدث خطأ أثناء إصلاح التشققات');
            hideProgress();
        }
    }, 100);
}

function resetImage() {
    if (!originalImage) return;
    
    // Clear processed canvas
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    document.getElementById('processedPlaceholder').classList.remove('hidden');
    document.getElementById('downloadBtn').disabled = true;
}

function downloadImage() {
    if (processedCanvas.width === 0) {
        alert('لا توجد صورة معالجة للتحميل');
        return;
    }
    
    processedCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'restored_image_' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function saveSettings() {
    const settings = {
        denoiseStrength: document.getElementById('denoiseStrength').value,
        denoiseColor: document.getElementById('denoiseColor').value,
        sharpenAmount: document.getElementById('sharpenAmount').value,
        contrastAmount: document.getElementById('contrastAmount').value,
        brightnessAmount: document.getElementById('brightnessAmount').value,
        morphSize: document.getElementById('morphSize').value,
        inpaintRadius: document.getElementById('inpaintRadius').value
    };
    
    localStorage.setItem('imageRestorationSettings', JSON.stringify(settings));
    alert('تم حفظ الإعدادات بنجاح!');
}

function loadSettings() {
    const saved = localStorage.getItem('imageRestorationSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        applySettings(settings);
        alert('تم تحميل الإعدادات بنجاح!');
    } else {
        alert('لا توجد إعدادات محفوظة');
    }
}

function loadSettingsFromStorage() {
    const saved = localStorage.getItem('imageRestorationSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        applySettings(settings);
    }
}

function applySettings(settings) {
    Object.keys(settings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.value = settings[key];
            // Trigger input event to update display
            element.dispatchEvent(new Event('input'));
        }
    });
}
