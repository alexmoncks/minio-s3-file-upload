const sharp = require('sharp');
const path = require('path');

// Configure Sharp to use more memory for processing large images
sharp.cache(false);
sharp.concurrency(1);

class ImageProcessingService {
    constructor() {
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    }

    isImageFile(mimetype) {
        return this.supportedImageTypes.includes(mimetype);
    }

    async processImage(buffer, options = {}) {
        const {
            width = 800,
            height = 600,
            maintainAspectRatio = true,
            removeBackground: shouldRemoveBackground = true
        } = options;

        try {
            let image = sharp(buffer, {
                limitInputPixels: false,
                sequentialRead: true
            });

            // Get image metadata
            const metadata = await image.metadata();
            console.log('Original image:', metadata);

            // Calculate dimensions maintaining aspect ratio
            let resizeOptions = {};
            if (maintainAspectRatio) {
                resizeOptions = {
                    width,
                    height,
                    fit: 'inside',
                    withoutEnlargement: true
                };
            } else {
                resizeOptions = {
                    width,
                    height,
                    fit: 'fill',
                    withoutEnlargement: true
                };
            }

            // First resize the image to reduce memory usage
            let processedImage = await image
                .resize(resizeOptions)
                .toBuffer();

            if (shouldRemoveBackground) {
                try {
                    // Step 1: Create enhanced version for better subject detection
                    const enhanced = await sharp(processedImage)
                        .modulate({
                            brightness: 1.1,
                            saturation: 1.2,
                            hue: 0
                        })
                        .toBuffer();

                    // Step 2: Create foreground mask
                    const foregroundMask = await sharp(enhanced)
                        .grayscale()
                        // Enhance contrast to separate subject from background
                        .linear(1.5, -0.25)
                        // Apply median filter to reduce noise
                        .median(3)
                        // Threshold to create binary mask
                        .threshold(45)
                        // Smooth edges
                        .blur(0.5)
                        .toBuffer();

                    // Step 3: Create edge mask
                    const edgeMask = await sharp(enhanced)
                        .grayscale()
                        // Detect edges using Laplacian kernel
                        .convolve({
                            width: 3,
                            height: 3,
                            kernel: [
                                0, -1, 0,
                                -1, 4, -1,
                                0, -1, 0
                            ],
                            scale: 2,
                            offset: 128
                        })
                        // Enhance edges
                        .linear(1.5, -0.15)
                        .blur(0.3)
                        .toBuffer();

                    // Step 4: Combine masks
                    const combinedMask = await sharp(foregroundMask)
                        .composite([
                            {
                                input: edgeMask,
                                blend: 'overlay'
                            }
                        ])
                        // Ensure proper black and white values
                        .normalise()
                        // Smooth transitions
                        .blur(0.8)
                        .toBuffer();

                    // Step 5: Apply the mask to create transparency
                    processedImage = await sharp(processedImage)
                        .ensureAlpha()
                        .composite([
                            {
                                input: combinedMask,
                                blend: 'dest-in'
                            }
                        ])
                        .png({
                            compressionLevel: 9,
                            adaptiveFiltering: true,
                            force: true
                        })
                        .toBuffer();

                    return processedImage;
                } catch (error) {
                    console.error('Background removal failed:', error);
                    throw new Error(`Background removal failed: ${error.message}`);
                }
            }

            // If no background removal, just convert to PNG
            return await sharp(processedImage)
                .png({
                    compressionLevel: 9,
                    adaptiveFiltering: true
                })
                .toBuffer();

        } catch (error) {
            console.error('Error processing image:', error);
            throw new Error(`Image processing failed: ${error.message}`);
        } finally {
            // Clear Sharp cache after processing
            sharp.cache(false);
        }
    }
}

module.exports = new ImageProcessingService(); 