const crypto = require('node:crypto');

const ITERATIONS = 100000;
const SALT_SIZE = 16;
const KEY_SIZE = 32;

async function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_SIZE);
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_SIZE, 'sha256');

    const saltBase64 = salt.toString('base64');
    const hashBase64 = hash.toString('base64');

    return `pbkdf2:${ITERATIONS}:${saltBase64}:${hashBase64}`;
}

const password = 'user123';
hashPassword(password).then(hash => {
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
});
