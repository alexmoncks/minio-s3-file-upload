// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const uploadStatus = document.getElementById('uploadStatus');
const fileList = document.getElementById('fileList');
const previewModal = document.getElementById('previewModal');
const previewContent = document.getElementById('previewContent');
const previewTitle = document.getElementById('previewTitle');
const searchInput = document.getElementById('searchInput');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// State
let currentPage = 1;
let currentSearch = '';
const pageSize = 12;

// Image processing options
let imageProcessingOptions = {
    width: 800,
    height: 600,
    maintainAspectRatio: true,
    removeBackground: true
};

// File type detection
const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const textTypes = ['text/plain', 'text/csv', 'text/html', 'text/css', 'application/javascript'];

// Add bucket stats variables
let bucketStats = {
    totalSize: 0,
    fileCount: 0,
    maxSize: 0,
    remainingSpace: 0,
    usedPercentage: 0
};

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// File handling
async function handleFiles(files) {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            showNotification(`File "${file.name}" is too large. Maximum file size is 50MB.`, 'warning');
            continue;
        }
        
        if (imageTypes.includes(file.type)) {
            showImageProcessingOptions(file);
        } else {
            await uploadFile(file);
        }
    }
}

function showImageProcessingOptions(file) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Image Processing Options</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Width</label>
                        <input type="number" class="form-control" id="imageWidth" value="800">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Height</label>
                        <input type="number" class="form-control" id="imageHeight" value="600">
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="maintainAspectRatio" checked>
                        <label class="form-check-label">Maintain Aspect Ratio</label>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="removeBackground" checked>
                        <label class="form-check-label">Remove Background</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="processImage">Process & Upload</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();

    document.getElementById('processImage').addEventListener('click', async () => {
        const options = {
            width: parseInt(document.getElementById('imageWidth').value),
            height: parseInt(document.getElementById('imageHeight').value),
            maintainAspectRatio: document.getElementById('maintainAspectRatio').checked,
            removeBackground: document.getElementById('removeBackground').checked
        };
        modalInstance.hide();
        await uploadFile(file, options);
    });

    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

async function uploadFile(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // Add image processing options if provided
    if (options.width) formData.append('width', options.width);
    if (options.height) formData.append('height', options.height);
    if (options.maintainAspectRatio !== undefined) formData.append('maintainAspectRatio', options.maintainAspectRatio);
    if (options.removeBackground !== undefined) formData.append('removeBackground', options.removeBackground);

    uploadProgress.classList.remove('d-none');
    uploadStatus.classList.remove('d-none');
    uploadStatus.textContent = `Uploading ${file.name}...`;

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        uploadStatus.textContent = `Successfully uploaded ${result.fileName}`;
        uploadProgress.querySelector('.progress-bar').style.width = '100%';
        
        // Refresh file list
        loadFiles();
    } catch (error) {
        console.error('Upload error:', error);
        uploadStatus.textContent = `Error uploading ${file.name}: ${error.message}`;
        uploadProgress.querySelector('.progress-bar').style.width = '0%';
    }
}

// File listing and pagination
async function loadFiles() {
    try {
        const response = await fetch(`/api/files?page=${currentPage}&pageSize=${pageSize}&search=${encodeURIComponent(currentSearch)}`);
        if (!response.ok) {
            throw new Error(`Failed to load files: ${response.statusText}`);
        }

        const data = await response.json();
        displayFiles(data.files);
        updatePagination(data.pagination);
        await loadBucketStats(); // Load bucket stats after loading files
    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('Error loading files. Please try again.', 'error');
        fileList.innerHTML = '<div class="alert alert-danger">Failed to load files. Please try again.</div>';
    }
}

function displayFiles(files) {
    fileList.innerHTML = '';
    
    if (!files || files.length === 0) {
        fileList.innerHTML = '<div class="alert alert-info">No files found.</div>';
        return;
    }
    
    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        
        const icon = getFileIcon(file.contentType);
        const size = formatFileSize(file.size);
        const date = new Date(file.lastModified).toLocaleString();
        
        // Create thumbnail container
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'file-thumbnail';
        
        if (imageTypes.includes(file.contentType)) {
            const img = document.createElement('img');
            img.src = `/api/thumbnail/${encodeURIComponent(file.name)}`;
            img.alt = file.name;
            img.className = 'img-thumbnail';
            img.onerror = () => {
                img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="%236c757d">Image not available</text></svg>';
            };
            thumbnailContainer.appendChild(img);
        } else {
            thumbnailContainer.innerHTML = `<i class="${icon} fa-2x"></i>`;
        }
        
        card.innerHTML = `
            <div class="file-icon">
                <i class="${icon}"></i>
            </div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${size}</div>
            <div class="file-date">${date}</div>
            <div class="file-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="previewFile('${encodeURIComponent(file.name)}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="downloadFile('${encodeURIComponent(file.name)}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFile('${encodeURIComponent(file.name)}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Insert thumbnail at the beginning of the card
        card.insertBefore(thumbnailContainer, card.firstChild);
        fileList.appendChild(card);
    });
}

function updatePagination(pagination) {
    currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Search functionality with debounce
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1; // Reset to first page on new search
        loadFiles();
    }, 500); // Increased debounce time to 500ms
});

// Pagination controls
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadFiles();
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    loadFiles();
});

// File operations
async function previewFile(fileName) {
    try {
        const fileInfo = await getFileInfo(fileName);
        const contentType = fileInfo.contentType;
        
        previewTitle.textContent = fileName;
        previewContent.innerHTML = '';
        
        if (imageTypes.includes(contentType)) {
            const response = await fetch(`/api/preview/${fileName}`);
            if (!response.ok) throw new Error(`Failed to get file: ${response.statusText}`);
            const blob = await response.blob();
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.className = 'img-fluid';
            previewContent.appendChild(img);
        } else if (contentType.startsWith('video/')) {
            const response = await fetch(`/api/preview/${fileName}`);
            if (!response.ok) throw new Error(`Failed to get file: ${response.statusText}`);
            const blob = await response.blob();
            const video = document.createElement('video');
            video.controls = true;
            video.className = 'w-100';
            video.src = URL.createObjectURL(blob);
            previewContent.appendChild(video);
        } else if (contentType.startsWith('audio/')) {
            const response = await fetch(`/api/preview/${fileName}`);
            if (!response.ok) throw new Error(`Failed to get file: ${response.statusText}`);
            const blob = await response.blob();
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.className = 'w-100';
            audio.src = URL.createObjectURL(blob);
            previewContent.appendChild(audio);
        } else if (contentType === 'application/pdf') {
            // Create a container for the PDF preview
            const container = document.createElement('div');
            container.className = 'pdf-preview';
            container.style.height = '80vh';
            container.style.width = '100%';
            
            // Create iframe for PDF
            const iframe = document.createElement('iframe');
            iframe.src = `/api/preview/${fileName}`;
            iframe.className = 'w-100 h-100';
            iframe.style.border = 'none';
            
            // Add styles for the preview
            const style = document.createElement('style');
            style.textContent = `
                .pdf-preview {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                    position: relative;
                }
                .pdf-preview iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                .pdf-preview::before {
                    content: 'Loading PDF...';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 1.2em;
                    color: #6c757d;
                    z-index: 1;
                }
                .pdf-preview iframe:not([src=""]) + .pdf-preview::before {
                    display: none;
                }
            `;
            document.head.appendChild(style);
            
            // Add error handling for iframe
            iframe.onerror = () => {
                container.innerHTML = `
                    <div class="alert alert-danger m-3">
                        Failed to load PDF. Please try downloading the file instead.
                    </div>
                `;
            };
            
            // Add load event handler
            iframe.onload = () => {
                container.querySelector('.pdf-preview::before')?.remove();
            };
            
            container.appendChild(iframe);
            previewContent.appendChild(container);
        } else if (isOfficeFile(contentType)) {
            // Handle Office files
            const response = await fetch(`/api/preview-office/${fileName}`);
            if (!response.ok) throw new Error(`Failed to get file: ${response.statusText}`);
            const data = await response.json();
            
            // Create a container for the Office preview
            const container = document.createElement('div');
            container.className = 'office-preview';
            
            // Add styles for the preview
            const style = document.createElement('style');
            style.textContent = `
                .office-preview {
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .office-preview table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .office-preview td {
                    padding: 8px;
                    border: 1px solid #dee2e6;
                }
                .office-preview img {
                    max-width: 100%;
                    height: auto;
                }
                .office-preview p {
                    margin-bottom: 1rem;
                }
            `;
            document.head.appendChild(style);
            
            container.innerHTML = data.html;
            previewContent.appendChild(container);
        } else {
            const response = await fetch(`/api/preview/${fileName}`);
            if (!response.ok) throw new Error(`Failed to get file: ${response.statusText}`);
            const blob = await response.blob();
            const text = await blob.text();
            const pre = document.createElement('pre');
            pre.className = 'bg-light p-3 rounded';
            pre.style.maxHeight = '80vh';
            pre.style.overflow = 'auto';
            pre.textContent = text;
            previewContent.appendChild(pre);
        }
        
        previewModal.style.display = 'block';
    } catch (error) {
        console.error('Preview error:', error);
        showNotification('Error previewing file', 'error');
    }
}

// Helper function to check if file is an Office file
function isOfficeFile(contentType) {
    return [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ].includes(contentType);
}

// Helper function to get file info
async function getFileInfo(fileName) {
    try {
        const decodedFileName = decodeURIComponent(fileName);
        const response = await fetch(`/api/files?search=${encodeURIComponent(decodedFileName)}`);
        if (!response.ok) throw new Error('Failed to get file info');
        const data = await response.json();
        const file = data.files.find(file => file.name === decodedFileName);
        if (!file) throw new Error('File not found');
        return file;
    } catch (error) {
        console.error('Error getting file info:', error);
        throw error;
    }
}

async function downloadFile(fileName) {
    try {
        const response = await fetch(`/api/files/${fileName}`);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Error downloading file', 'error');
    }
}

async function deleteFile(fileName) {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/${fileName}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        showNotification('File deleted successfully', 'success');
        loadFiles();
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Error deleting file', 'error');
    }
}

// Utility functions
function getFileIcon(contentType) {
    if (imageTypes.includes(contentType)) {
        return 'fas fa-image';
    } else if (documentTypes.includes(contentType)) {
        return 'fas fa-file-alt';
    } else if (textTypes.includes(contentType)) {
        return 'fas fa-file-code';
    } else if (contentType.startsWith('video/')) {
        return 'fas fa-video';
    } else if (contentType.startsWith('audio/')) {
        return 'fas fa-music';
    } else {
        return 'fas fa-file';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alert, document.querySelector('.file-grid'));
    setTimeout(() => alert.remove(), 5000);
}

// Close preview modal
document.querySelector('.close-preview').addEventListener('click', () => {
    previewModal.style.display = 'none';
    previewContent.innerHTML = '';
});

window.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = 'none';
        previewContent.innerHTML = '';
    }
});

// Function to format bytes to human readable size
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to update bucket stats display
function updateBucketStats() {
    const statsContainer = document.getElementById('bucketStats');
    if (!statsContainer) return;

    const usedSpace = formatBytes(bucketStats.totalSize);
    const totalSpace = formatBytes(bucketStats.maxSize);
    const remainingSpace = formatBytes(bucketStats.remainingSpace);
    
    statsContainer.innerHTML = `
        <div class="bucket-stats">
            <div class="stat-item">
                <i class="fas fa-hdd"></i>
                <span>Used Space: ${usedSpace}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-database"></i>
                <span>Total Space: ${totalSpace}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-space-shuttle"></i>
                <span>Available: ${remainingSpace}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-file"></i>
                <span>Total Files: ${bucketStats.fileCount}</span>
            </div>
        </div>
        <div class="progress">
            <div class="progress-bar" role="progressbar" 
                 style="width: ${bucketStats.usedPercentage}%" 
                 aria-valuenow="${bucketStats.usedPercentage}" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
            </div>
        </div>
    `;
}

// Function to load bucket stats
async function loadBucketStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error('Failed to load bucket stats');
        }
        bucketStats = await response.json();
        updateBucketStats();
    } catch (error) {
        console.error('Error loading bucket stats:', error);
        showNotification('Failed to load bucket statistics', 'error');
    }
}

// Initial load
loadFiles(); 