/* ============================================
   Image Upload Module — Photo Capture & Preview
   ============================================
   Handles customer photos and jewelry item photos.
   Dual compression: smart settings per image type.
   Stores as base64 in localStorage. Canvas-based compression.
*/
const ImageUpload = (() => {
    // Compression profiles for different image types
    const COMPRESSION_PROFILES = {
        'customer': {
            maxSizeKB: 120,
            maxDimension: 800,
            qualityRange: [0.70, 0.60], // Start at 70%, go down to 60%
            description: '👤 Customer Photo'
        },
        'gold': {
            maxSizeKB: 400,
            maxDimension: 1400,
            qualityRange: [0.85, 0.70], // Start at 85%, go down to 70%
            description: '🪙 Gold Item Photo'
        },
        'default': {
            maxSizeKB: 500,
            maxDimension: 800,
            qualityRange: [0.80, 0.60],
            description: 'Photo'
        }
    };

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * Determine image type from inputId
     * @param {string} inputId
     * @returns {string} profile key
     */
    function getCompressionProfile(inputId) {
        if (inputId.includes('customer')) return 'customer';
        if (inputId.includes('item') || inputId.includes('gold')) return 'gold';
        return 'default';
    }

    /**
     * Render an image uploader component
     * @param {string} inputId — unique ID for the file input
     * @param {string|null} existingBase64 — existing image data
     * @param {object} opts — { label, compact, type: 'customer'|'gold' }
     * @returns {string} HTML string
     */
    function renderUploader(inputId, existingBase64 = null, opts = {}) {
        const label = opts.label || 'Upload Photo';
        const compact = opts.compact || false;
        const hasImage = existingBase64 && existingBase64.length > 50;
        const profile = opts.type ? opts.type : getCompressionProfile(inputId);
        const profileSettings = COMPRESSION_PROFILES[profile] || COMPRESSION_PROFILES['default'];

        return `
            <div class="img-upload-container ${compact ? 'compact' : ''}" id="${inputId}-container">
                ${hasImage ? `
                    <div class="img-preview-wrapper">
                        <img src="${existingBase64}" class="img-preview" alt="Photo" />
                        <button type="button" class="img-remove-btn" onclick="ImageUpload.removeImage('${inputId}')" title="Remove">✕</button>
                    </div>
                ` : `
                    <label class="img-upload-area" for="${inputId}">
                        <span class="img-upload-icon">📷</span>
                        <span class="img-upload-text">${label}</span>
                        <span class="img-upload-hint">${profileSettings.description} • Max ${profileSettings.maxSizeKB}KB</span>
                    </label>
                `}
                <input type="file" id="${inputId}" accept="image/jpeg,image/png,image/webp"
                    class="img-file-input" data-compression-type="${profile}" 
                    onchange="ImageUpload.handleFileSelect('${inputId}', this)" />
            </div>
        `;
    }

    /**
     * Handle file selection — compress & preview
     * @param {string} inputId
     * @param {HTMLInputElement} inputEl
     * @param {function} callback — optional, called with { base64, originalSize, compressedSize }
     */
    function handleFileSelect(inputId, inputEl, callback) {
        const file = inputEl.files[0];
        if (!file) return;

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            UI.toast('Only JPG, PNG, or WebP images allowed', 'error');
            inputEl.value = '';
            return;
        }

        // Validate size (before compression)
        if (file.size > 5 * 1024 * 1024) { // 5MB raw max
            UI.toast('Image too large. Max 5MB allowed.', 'error');
            inputEl.value = '';
            return;
        }

        const originalSize = file.size;
        const profile = inputEl.dataset.compressionType || getCompressionProfile(inputId);

        compressImage(file, profile, (result) => {
            if (!result) {
                UI.toast('Failed to process image', 'error');
                return;
            }

            const { base64, compressedSize } = result;

            // Store in a data attribute for retrieval
            const container = document.getElementById(`${inputId}-container`);
            if (container) {
                container.dataset.imageData = base64;
                container.dataset.originalSize = originalSize;
                container.dataset.compressedSize = compressedSize;
                
                const profileSettings = COMPRESSION_PROFILES[profile] || COMPRESSION_PROFILES['default'];
                const compressionText = `${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB`;
                
                container.innerHTML = `
                    <div class="img-preview-wrapper">
                        <img src="${base64}" class="img-preview" alt="Photo" />
                        <button type="button" class="img-remove-btn" onclick="ImageUpload.removeImage('${inputId}')" title="Remove">✕</button>
                        <div class="img-compression-info" style="font-size:0.7rem;color:var(--success);padding:4px;background:rgba(52,211,153,0.1);border-radius:2px;white-space:nowrap;margin-top:4px;">✓ ${compressionText}</div>
                    </div>
                    <input type="file" id="${inputId}" accept="image/jpeg,image/png,image/webp"
                        class="img-file-input" data-compression-type="${profile}"
                        onchange="ImageUpload.handleFileSelect('${inputId}', this)" />
                `;
            }

            if (callback) callback(result);
        });
    }

    /**
     * Compress image using Canvas with profile-specific settings
     * @param {File} file
     * @param {string} profile — 'customer', 'gold', or 'default'
     * @param {function} callback — called with { base64, compressedSize } or null
     */
    function compressImage(file, profile, callback) {
        const settings = COMPRESSION_PROFILES[profile] || COMPRESSION_PROFILES['default'];
        const targetSizeKB = settings.maxSizeKB;
        const maxDimension = settings.maxDimension;
        const [qualityStart, qualityEnd] = settings.qualityRange;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if needed
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Try different quality levels to hit target size
                let quality = qualityStart;
                let base64 = canvas.toDataURL('image/jpeg', quality);
                const targetBytes = targetSizeKB * 1370; // ~1370 base64 chars per KB

                while (base64.length > targetBytes && quality > qualityEnd) {
                    quality -= 0.05;
                    base64 = canvas.toDataURL('image/jpeg', quality);
                }

                // Calculate compressed size
                const compressedSize = base64.length / 1.37; // Rough conversion from base64 chars to bytes

                callback({ base64, compressedSize });
            };
            img.onerror = () => callback(null);
            img.src = e.target.result;
        };
        reader.onerror = () => callback(null);
        reader.readAsDataURL(file);
    }

    /**
     * Remove image from container
     */
    function removeImage(inputId) {
        const container = document.getElementById(`${inputId}-container`);
        if (container) {
            container.dataset.imageData = '';
            container.dataset.originalSize = '';
            container.dataset.compressedSize = '';
            const profile = container.querySelector('input[data-compression-type]')?.dataset.compressionType || getCompressionProfile(inputId);
            const profileSettings = COMPRESSION_PROFILES[profile] || COMPRESSION_PROFILES['default'];
            
            container.innerHTML = `
                <label class="img-upload-area" for="${inputId}">
                    <span class="img-upload-icon">📷</span>
                    <span class="img-upload-text">Upload Photo</span>
                    <span class="img-upload-hint">${profileSettings.description} • Max ${profileSettings.maxSizeKB}KB</span>
                </label>
                <input type="file" id="${inputId}" accept="image/jpeg,image/png,image/webp"
                    class="img-file-input" data-compression-type="${profile}"
                    onchange="ImageUpload.handleFileSelect('${inputId}', this)" />
            `;
        }
    }

    /**
     * Get the stored image data from a container
     */
    function getImageData(inputId) {
        const container = document.getElementById(`${inputId}-container`);
        return container ? (container.dataset.imageData || '') : '';
    }

    /**
     * Get compression info for an image
     */
    function getCompressionInfo(inputId) {
        const container = document.getElementById(`${inputId}-container`);
        if (!container) return null;
        return {
            originalSize: parseInt(container.dataset.originalSize || 0),
            compressedSize: parseInt(container.dataset.compressedSize || 0)
        };
    }

    /**
     * Render a small thumbnail for display (non-editable)
     */
    function renderThumbnail(base64, size = 48) {
        if (!base64 || base64.length < 50) {
            return `<div class="img-thumb-placeholder" style="width:${size}px;height:${size}px;">📷</div>`;
        }
        return `<img src="${base64}" class="img-thumb" style="width:${size}px;height:${size}px;" alt="Photo" />`;
    }

    return {
        renderUploader,
        handleFileSelect,
        removeImage,
        getImageData,
        getCompressionInfo,
        renderThumbnail,
        compressImage,
        getCompressionProfile,
        COMPRESSION_PROFILES
    };
})();
