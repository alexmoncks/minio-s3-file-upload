// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const uploadStatus = document.getElementById('uploadStatus');
const fileList = document.getElementById('fileList');
const previewModal = document.getElementById('previewModal');
const previewContent = document.getElementById('previewContent');
const previewTitle = document.getElementById('previewTitle');

// File type detection
const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const textTypes = ['text/plain', 'text/html', 'text/css', 'text/javascript'];

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// File handling
function handleFiles(files) {
    Array.from(files).forEach(file => {
        uploadFile(file);
    });
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    uploadProgress.classList.remove('hidden');
    uploadStatus.textContent = '0%';

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        showNotification('File uploaded successfully', 'success');
        loadFileList();
    } catch (error) {
        showNotification('Upload failed: ' + error.message, 'error');
    } finally {
        uploadProgress.classList.add('hidden');
    }
}

// File listing
async function loadFileList() {
    try {
        const response = await fetch('/api/files');
        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }

        const files = await response.json();
        renderFileList(files);
    } catch (error) {
        showNotification('Failed to load files: ' + error.message, 'error');
    }
}

function renderFileList(files) {
    fileList.innerHTML = files.map(file => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <button onclick="previewFile('${file.name}', '${file.type}')" class="text-blue-600 hover:text-blue-900">
                    ${file.name}
                </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatFileSize(file.size)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(file.lastModified)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="previewFile('${file.name}', '${file.type}')" class="text-green-600 hover:text-green-900 mr-3" title="Preview">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="downloadFile('${file.name}')" class="text-blue-600 hover:text-blue-900 mr-3" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="deleteFile('${file.name}')" class="text-red-600 hover:text-red-900" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Preview functionality
async function previewFile(fileName, fileType) {
    try {
        const response = await fetch(`/api/preview/${encodeURIComponent(fileName)}`);
        if (!response.ok) throw new Error('Preview failed');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        previewTitle.textContent = fileName;
        previewContent.innerHTML = '';
        
        if (imageTypes.includes(fileType)) {
            // Image preview
            const img = document.createElement('img');
            img.src = url;
            img.className = 'max-w-full h-auto mx-auto';
            previewContent.appendChild(img);
        } else if (documentTypes.includes(fileType)) {
            // PDF preview
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.className = 'w-full h-[80vh]';
            previewContent.appendChild(iframe);
        } else if (textTypes.includes(fileType)) {
            // Text preview
            const text = await blob.text();
            const pre = document.createElement('pre');
            pre.className = 'whitespace-pre-wrap font-mono text-sm';
            pre.textContent = text;
            previewContent.appendChild(pre);
        } else {
            // Unsupported file type
            previewContent.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Preview not available for this file type</p>
                    <p class="text-sm text-gray-500 mt-2">Please download the file to view it</p>
                </div>
            `;
        }
        
        previewModal.classList.remove('hidden');
        previewModal.classList.add('flex');
    } catch (error) {
        showNotification('Preview failed: ' + error.message, 'error');
    }
}

function closePreview() {
    previewModal.classList.add('hidden');
    previewModal.classList.remove('flex');
    previewContent.innerHTML = '';
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// File actions
async function downloadFile(fileName) {
    try {
        const response = await fetch(`/api/download/${encodeURIComponent(fileName)}`);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        showNotification('Download failed: ' + error.message, 'error');
    }
}

async function deleteFile(fileName) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
        const response = await fetch(`/api/delete/${encodeURIComponent(fileName)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Delete failed');
        
        showNotification('File deleted successfully', 'success');
        loadFileList();
    } catch (error) {
        showNotification('Delete failed: ' + error.message, 'error');
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', loadFileList); 