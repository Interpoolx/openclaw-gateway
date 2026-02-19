import { Buffer } from 'node:buffer';

/**
 * CRYPTO UTILITIES
 * 
 * Secure password hashing and verification using the Web Crypto API.
 * This implementation uses PBKDF2 with SHA-256, which is natively supported
 * in Cloudflare Workers and provided by the browser environment.
 */

const ITERATIONS = 100000;
const SALT_SIZE = 16;
const KEY_SIZE = 32;

/**
 * Hash a plain text password.
 * Returns a string in the format: pbkdf2:iterations:salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const passwordBuffer = new TextEncoder().encode(password);

    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const hash = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        KEY_SIZE * 8
    );

    const saltBase64 = Buffer.from(salt).toString('base64');
    const hashBase64 = Buffer.from(new Uint8Array(hash)).toString('base64');

    return `pbkdf2:${ITERATIONS}:${saltBase64}:${hashBase64}`;
}

/**
 * Verify a plain text password against a stored hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    // Check if it's a legacy plain text password (for migration)
    if (!storedHash.startsWith('pbkdf2:')) {
        return password === storedHash;
    }

    const [schema, iterationsStr, saltBase64, hashBase64] = storedHash.split(':');

    if (schema !== 'pbkdf2') {
        throw new Error('Unsupported hashing schema');
    }

    const iterations = parseInt(iterationsStr, 10);
    const salt = new Uint8Array(Buffer.from(saltBase64, 'base64'));
    const expectedHash = Buffer.from(hashBase64, 'base64');

    const passwordBuffer = new TextEncoder().encode(password);
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const derivedHashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: 'SHA-256'
        },
        baseKey,
        KEY_SIZE * 8
    );

    const derivedHash = new Uint8Array(derivedHashBuffer);

    if (derivedHash.length !== expectedHash.length) {
        return false;
    }

    // Standard comparison is fine for this context
    for (let i = 0; i < derivedHash.length; i++) {
        if (derivedHash[i] !== expectedHash[i]) {
            return false;
        }
    }

    return true;
}
