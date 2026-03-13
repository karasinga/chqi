// =====================================================
// INTELLIGENT FILE SIZE LIMITS FOR RESEARCH DATA
// =====================================================

// Base configuration - can be overridden by environment or backend
const FILE_SIZE_CONFIG = {
    // Default limit for standard documents
    default: 50 * 1024 * 1024, // 50 MB

    // Category-specific limits
    limits: {
        // Documents (papers, reports, manuscripts)
        document: 100 * 1024 * 1024, // 100 MB

        // Spreadsheets (survey data, statistical outputs)
        spreadsheet: 200 * 1024 * 1024, // 200 MB

        // Images (microscopy, scans, photographs)
        image: 500 * 1024 * 1024, // 500 MB

        // Audio (interviews, focus groups, recordings)
        audio: 1 * 1024 * 1024 * 1024, // 1 GB

        // Video (observations, experiments, presentations)
        video: 5 * 1024 * 1024 * 1024, // 5 GB

        // Data files (datasets, databases, exports)
        data: 2 * 1024 * 1024 * 1024, // 2 GB

        // Archives (compressed research packages)
        archive: 10 * 1024 * 1024 * 1024, // 10 GB

        // Code/scripts (analysis scripts, notebooks)
        code: 50 * 1024 * 1024, // 50 MB

        // Generic/other
        other: 100 * 1024 * 1024, // 100 MB
    },

    // Warn threshold (percentage of limit to show warning)
    warnThreshold: 0.8, // 80%

    // Allow override via chunked upload for very large files
    chunkedUploadThreshold: 100 * 1024 * 1024, // 100 MB
};

// File extension to category mapping
const FILE_CATEGORIES = {
    // Documents
    document: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'tex', 'epub'],

    // Spreadsheets & Statistical
    spreadsheet: ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'sav', 'sas7bdat', 'dta', 'por', 'rdata', 'rds'],

    // Images
    image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'tiff', 'tif', 'bmp', 'raw', 'cr2', 'nef', 'heic', 'psd', 'ai'],

    // Audio
    audio: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'aiff'],

    // Video
    video: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpeg', 'mpg', '3gp'],

    // Data files
    data: [
        'json', 'xml', 'yaml', 'yml',           // Structured data
        'sql', 'sqlite', 'db', 'mdb', 'accdb',  // Databases
        'parquet', 'feather', 'arrow',          // Big data formats
        'hdf5', 'h5', 'nc', 'netcdf',           // Scientific data
        'mat', 'npy', 'npz',                    // MATLAB/NumPy
        'fits', 'fts',                          // Astronomy
        'shp', 'geojson', 'kml', 'gpx',         // Geospatial
    ],

    // Archives
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz'],

    // Code
    code: ['py', 'r', 'js', 'ts', 'ipynb', 'rmd', 'jl', 'm', 'do', 'sps', 'sas'],
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the category of a file based on its extension
 */
const getFileCategory = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return 'other';

    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
        if (extensions.includes(ext)) {
            return category;
        }
    }
    return 'other';
};

/**
 * Get the size limit for a specific file
 */
const getFileSizeLimit = (filename) => {
    const category = getFileCategory(filename);
    return FILE_SIZE_CONFIG.limits[category] || FILE_SIZE_CONFIG.default;
};

/**
 * Format bytes to human readable string
 */
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Get all allowed extensions as a flat array
 */
const getAllowedExtensions = () => {
    return Object.values(FILE_CATEGORIES).flat();
};

/**
 * Validate files with category-aware size limits
 */
const validateFiles = (files) => {
    const results = {
        validFiles: [],
        errors: [],
        warnings: [],
        requiresChunkedUpload: [],
    };

    const allowedExtensions = getAllowedExtensions();

    Array.from(files).forEach((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const category = getFileCategory(file.name);
        const sizeLimit = getFileSizeLimit(file.name);
        const warnThreshold = sizeLimit * FILE_SIZE_CONFIG.warnThreshold;

        // Check extension
        if (!ext || !allowedExtensions.includes(ext)) {
            results.errors.push({
                file: file.name,
                reason: 'unsupported_type',
                message: `Unsupported file type (.${ext || 'unknown'})`,
                suggestion: `Supported ${category} formats: ${FILE_CATEGORIES[category]?.join(', ') || 'N/A'}`,
            });
            return;
        }

        // Check size
        if (file.size > sizeLimit) {
            results.errors.push({
                file: file.name,
                reason: 'size_exceeded',
                message: `File size (${formatFileSize(file.size)}) exceeds ${category} limit (${formatFileSize(sizeLimit)})`,
                category,
                fileSize: file.size,
                limit: sizeLimit,
                suggestion: category === 'video' || category === 'data'
                    ? 'Consider compressing or splitting the file'
                    : 'Try compressing the file or contact admin for larger uploads',
            });
            return;
        }

        // Check if needs chunked upload
        if (file.size > FILE_SIZE_CONFIG.chunkedUploadThreshold) {
            results.requiresChunkedUpload.push(file);
        }

        // Warning for large files approaching limit
        if (file.size > warnThreshold) {
            results.warnings.push({
                file: file.name,
                message: `Large file (${formatFileSize(file.size)}) - ${Math.round((file.size / sizeLimit) * 100)}% of ${category} limit`,
            });
        }

        results.validFiles.push({
            file,
            category,
            sizeLimit,
            needsChunkedUpload: file.size > FILE_SIZE_CONFIG.chunkedUploadThreshold,
        });
    });

    return results;
};

/**
 * Get upload guidance for a file category
 */
const getUploadGuidance = (category) => {
    const guidance = {
        document: {
            limit: FILE_SIZE_CONFIG.limits.document,
            tips: [
                'PDFs with embedded images can be large - consider optimizing',
                'Use PDF/A format for long-term archival',
            ],
        },
        spreadsheet: {
            limit: FILE_SIZE_CONFIG.limits.spreadsheet,
            tips: [
                'Large datasets: consider Parquet or Feather format for efficiency',
                'Remove unnecessary formatting to reduce file size',
            ],
        },
        image: {
            limit: FILE_SIZE_CONFIG.limits.image,
            tips: [
                'RAW files are large - consider keeping originals offline',
                'Use TIFF for lossless archival, JPEG for sharing',
            ],
        },
        audio: {
            limit: FILE_SIZE_CONFIG.limits.audio,
            tips: [
                'Interview recordings: MP3 at 128kbps is usually sufficient',
                'Archive quality: use FLAC or WAV',
            ],
        },
        video: {
            limit: FILE_SIZE_CONFIG.limits.video,
            tips: [
                'Compress with H.264/H.265 codec before upload',
                'Consider uploading to institutional media server for very large files',
            ],
        },
        data: {
            limit: FILE_SIZE_CONFIG.limits.data,
            tips: [
                'Use columnar formats (Parquet) for large tabular data',
                'Compress with gzip for text-based formats (JSON, CSV)',
            ],
        },
        archive: {
            limit: FILE_SIZE_CONFIG.limits.archive,
            tips: [
                'Use 7z for best compression ratio',
                'Split very large archives into parts',
            ],
        },
        code: {
            limit: FILE_SIZE_CONFIG.limits.code,
            tips: [
                'Keep data files separate from code',
                'Use .gitignore patterns to exclude large generated files',
            ],
        },
    };

    return guidance[category] || {
        limit: FILE_SIZE_CONFIG.default,
        tips: ['Contact administrator for guidance on this file type'],
    };
};

export {
    FILE_SIZE_CONFIG,
    FILE_CATEGORIES,
    getFileCategory,
    getFileSizeLimit,
    formatFileSize,
    getAllowedExtensions,
    validateFiles,
    getUploadGuidance,
};
