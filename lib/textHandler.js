/**
 * 📝 TEXT HANDLER MODULE
 * Advanced text processing, validation, and delivery confirmation for WhatsApp messages
 * Boresha ubora wa maoni na uhakika wa utumwaji
 */

const chalk = require('chalk');

/**
 * Text Quality Standards
 */
const TEXT_CONFIG = {
    MAX_LENGTH: 4096, // WhatsApp limit
    MIN_QUALITY_LENGTH: 1,
    TIMEOUT: 30000, // 30 seconds
    RETRY_COUNT: 3,
    RETRY_DELAY: 2000
};

/**
 * Validate and clean text messages
 */
class TextValidator {
    /**
     * Check if text is valid for WhatsApp
     */
    static isValid(text) {
        if (!text || typeof text !== 'string') return false;
        const trimmed = text.trim();
        return trimmed.length > 0 && trimmed.length <= TEXT_CONFIG.MAX_LENGTH;
    }

    /**
     * Sanitize text - remove harmful characters
     */
    static sanitize(text) {
        if (!text) return '';
        
        let sanitized = String(text)
            .trim()
            .replace(/\0/g, '') // Null bytes
            .replace(/[\u0000-\u001F\u007F]/g, '') // Control characters (except newline, tab)
            .replace(/\u200B/g, '') // Zero-width space
            .replace(/\u200C/g, '') // Zero-width non-joiner
            .replace(/\u200D/g, '') // Zero-width joiner
            .replace(/\uFEFF/g, ''); // Zero-width no-break space

        // Limit length
        if (sanitized.length > TEXT_CONFIG.MAX_LENGTH) {
            sanitized = sanitized.substring(0, TEXT_CONFIG.MAX_LENGTH);
        }

        return sanitized;
    }

    /**
     * Get text quality score (0-100)
     */
    static getQualityScore(text) {
        if (!text || typeof text !== 'string') return 0;
        
        const length = text.length;
        const hasEmojis = /\p{Emoji}/u.test(text);
        const hasSpecialChars = /[^\w\s\-.,!?()@#\n]/g.test(text);
        
        let score = 100;
        
        // Length penalty
        if (length < 1) score -= 100;
        else if (length < 5) score -= 20;
        else if (length > TEXT_CONFIG.MAX_LENGTH) score -= 50;
        
        // Bonus for quality content
        if (hasEmojis) score += 5;
        if (text.includes('\n')) score += 3;
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get detailed validation info
     */
    static validate(text) {
        return {
            isValid: this.isValid(text),
            length: text ? text.length : 0,
            maxLength: TEXT_CONFIG.MAX_LENGTH,
            qualityScore: this.getQualityScore(text),
            sanitized: this.sanitize(text),
            warnings: this.getWarnings(text)
        };
    }

    /**
     * Get validation warnings
     */
    static getWarnings(text) {
        const warnings = [];
        
        if (!text) warnings.push('Empty text');
        if (text && text.length > TEXT_CONFIG.MAX_LENGTH) warnings.push('Text exceeds WhatsApp limit');
        if (text && text.length < TEXT_CONFIG.MIN_QUALITY_LENGTH) warnings.push('Text too short');
        if (text && /[\u0000-\u001F]/.test(text)) warnings.push('Contains control characters');
        
        return warnings;
    }
}

/**
 * Message delivery tracker
 */
class DeliveryTracker {
    constructor() {
        this.deliveries = new Map();
        this.maxHistorySize = 1000;
    }

    /**
     * Track a message delivery
     */
    track(messageId, chatId, text, timestamp = Date.now()) {
        const record = {
            messageId,
            chatId,
            text: text.substring(0, 50), // Store preview
            textLength: text.length,
            timestamp,
            status: 'pending',
            attempts: 0,
            confirmationTime: null
        };

        this.deliveries.set(messageId, record);

        // Clean up old records
        if (this.deliveries.size > this.maxHistorySize) {
            const firstKey = this.deliveries.keys().next().value;
            this.deliveries.delete(firstKey);
        }

        return record;
    }

    /**
     * Confirm delivery
     */
    confirm(messageId) {
        if (this.deliveries.has(messageId)) {
            const record = this.deliveries.get(messageId);
            record.status = 'delivered';
            record.confirmationTime = Date.now();
            record.deliveryDuration = record.confirmationTime - record.timestamp;
            return record;
        }
        return null;
    }

    /**
     * Mark as failed
     */
    fail(messageId) {
        if (this.deliveries.has(messageId)) {
            const record = this.deliveries.get(messageId);
            record.status = 'failed';
            record.attempts++;
            return record;
        }
        return null;
    }

    /**
     * Get delivery stats
     */
    getStats() {
        const records = Array.from(this.deliveries.values());
        const delivered = records.filter(r => r.status === 'delivered').length;
        const failed = records.filter(r => r.status === 'failed').length;
        const pending = records.filter(r => r.status === 'pending').length;
        
        const avgDeliveryTime = delivered > 0
            ? records
                .filter(r => r.deliveryDuration)
                .reduce((sum, r) => sum + r.deliveryDuration, 0) / delivered
            : 0;

        return {
            total: records.length,
            delivered,
            failed,
            pending,
            successRate: records.length > 0 ? (delivered / records.length * 100).toFixed(2) : 0,
            avgDeliveryTime: Math.round(avgDeliveryTime),
            maxHistorySize: this.maxHistorySize
        };
    }

    /**
     * Clear old records
     */
    cleanup(olderThanMs = 3600000) { // 1 hour default
        const cutoff = Date.now() - olderThanMs;
        for (const [key, record] of this.deliveries.entries()) {
            if (record.timestamp < cutoff) {
                this.deliveries.delete(key);
            }
        }
    }
}

/**
 * Send text message with quality checks and delivery confirmation
 */
async function sendTextMessage(sock, chatId, text, options = {}) {
    try {
        // Validate input
        if (!sock || !chatId) {
            throw new Error('Socket or ChatID missing');
        }

        // Validate and sanitize text
        const validation = TextValidator.validate(text);
        if (!validation.isValid) {
            console.warn(chalk.yellow(`⚠️  Text validation failed:`));
            validation.warnings.forEach(w => console.warn(chalk.yellow(`   • ${w}`)));
        }

        const cleanText = validation.sanitized;
        if (!cleanText) {
            throw new Error('Text sanitization resulted in empty message');
        }

        // Log quality info
        const qualityEmoji = validation.qualityScore >= 80 ? '✅' : 
                            validation.qualityScore >= 50 ? '⚠️' : '❌';
        console.log(chalk.blue(`${qualityEmoji} Quality: ${validation.qualityScore}/100 | Length: ${validation.length}/${TEXT_CONFIG.MAX_LENGTH}`));

        // Send message with timeout
        const sendPromise = sock.sendMessage(chatId, { text: cleanText }, options);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Message timeout')), TEXT_CONFIG.TIMEOUT)
        );

        const result = await Promise.race([sendPromise, timeoutPromise]);

        // Delivery confirmation
        if (result && result.key) {
            console.log(chalk.green(`✅ Message delivered successfully`));
            console.log(chalk.gray(`   Message ID: ${result.key.id}`));
            console.log(chalk.gray(`   Recipient: ${chatId}`));
            
            return {
                success: true,
                messageId: result.key.id,
                chatId,
                textLength: cleanText.length,
                timestamp: new Date(),
                originalMessage: result
            };
        }

        return { success: false };
    } catch (err) {
        console.error(chalk.red(`❌ Send text error: ${err.message}`));
        return {
            success: false,
            error: err.message
        };
    }
}

/**
 * Send text with retry logic
 */
async function sendTextWithRetry(sock, chatId, text, retries = TEXT_CONFIG.RETRY_COUNT) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await sendTextMessage(sock, chatId, text);
            if (result.success) {
                return result;
            }
        } catch (err) {
            console.error(chalk.yellow(`⚠️  Attempt ${attempt}/${retries} failed: ${err.message}`));
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, TEXT_CONFIG.RETRY_DELAY));
            }
        }
    }
    
    console.error(chalk.red(`❌ Failed to send message after ${retries} attempts`));
    return { success: false, error: 'Max retries exceeded' };
}

module.exports = {
    TextValidator,
    DeliveryTracker,
    sendTextMessage,
    sendTextWithRetry,
    TEXT_CONFIG
};
