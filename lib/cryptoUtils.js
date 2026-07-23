const crypto = require('crypto');

// Secret key obtained from environment variable ENCRYPTION_KEY
// Uses SHA-256 hash to ensure a 256-bit (32-byte) key length regardless of secret phrase length
const RAW_SECRET = process.env.ENCRYPTION_KEY || 'ftb_default_secure_encryption_key_2026';
const KEY = crypto.createHash('sha256').update(RAW_SECRET).digest();

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

const SENSITIVE_FIELDS = [
    'nama_pegawai',
    'nip',
    'jabatan',
    'unit_kerja_asal',
    'nomor_whatsapp',
    'nomor_whatsapp_kepegawaian',
    'nomor_nota_dinas',
    'alasan_tolak'
];

/**
 * Encrypt a plain text string using AES-256-GCM.
 * @param {string} text 
 * @returns {string}
 */
function encryptField(text) {
    if (text === null || text === undefined || text === '') return text;
    const strText = String(text);
    // Avoid double encryption
    if (strText.startsWith(PREFIX)) return strText;

    try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
        let encrypted = cipher.update(strText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('Encryption error:', err.message);
        return strText;
    }
}

/**
 * Decrypt an encrypted ciphertext string back to plain text.
 * Falls back to returning original text if not encrypted or decryption fails.
 * @param {string} text 
 * @returns {string}
 */
function decryptField(text) {
    if (text === null || text === undefined || text === '') return text;
    const strText = String(text);
    if (!strText.startsWith(PREFIX)) return strText; // Plain text backward compatibility

    try {
        const payload = strText.substring(PREFIX.length);
        const parts = payload.split(':');
        if (parts.length !== 3) return strText;

        const [ivHex, tagHex, cipherHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption error (possibly wrong key or corrupted data):', err.message);
        return strText;
    }
}

/**
 * Helper to encrypt all sensitive fields in a record object.
 * @param {Object} record 
 * @returns {Object}
 */
function encryptRecord(record) {
    if (!record || typeof record !== 'object') return record;
    const result = { ...record };
    for (const field of SENSITIVE_FIELDS) {
        if (result[field] !== undefined && result[field] !== null) {
            result[field] = encryptField(result[field]);
        }
    }
    return result;
}

/**
 * Helper to decrypt all sensitive fields in a record object.
 * @param {Object} record 
 * @returns {Object}
 */
function decryptRecord(record) {
    if (!record || typeof record !== 'object') return record;
    const result = { ...record };
    for (const field of SENSITIVE_FIELDS) {
        if (result[field] !== undefined && result[field] !== null) {
            result[field] = decryptField(result[field]);
        }
    }
    return result;
}

module.exports = {
    encryptField,
    decryptField,
    encryptRecord,
    decryptRecord,
    SENSITIVE_FIELDS
};
