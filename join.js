const fs = require('fs');
const crypto = require('crypto');

const inputDir = 'input/';
const index_file = inputDir + 'index.json';

if (!fs.existsSync(index_file)) {
    console.error('Error: Missing index.json file.');
    return;
}
const index_data = JSON.parse(fs.readFileSync(index_file, 'utf8'));
if (!index_data.name) {
    console.warn('File name missing from index.json.');
    index_data.name = 'unknown_name';
}
if (!index_data.chunks) {
    console.error('Error: Not a valid index.json.');
    return;
}
const output_file = 'output/' + index_data.name;
const chunk_count = index_data.chunks;

async function checkMissingChunks() {
    let missing_chunks = [];

    for (let i = 1; i <= chunk_count; i++) {
        const chunkfile_name = `${inputDir}chunk${i}`
        if (!fs.existsSync(chunkfile_name)) {
            missing_chunks.push(i);
        }
    }

    return missing_chunks;
}

async function checkMissingKeys() {
    let missing_keys = [];

    for (let i = 1; i <= chunk_count; i++) {
        if (!index_data.keys[i]) {
            missing_keys.push(i);
        }
    }

    return missing_keys;
}

async function combineChunks() {
    try {
        const missing_chunks = await checkMissingChunks();
        const missing_keys = await checkMissingKeys();

        if (missing_chunks.length > 0) {
            console.error(`Error: Missing chunks: ${missing_chunks.join(', ')}`);
            return;
        }

        if (missing_keys.length > 0) {
            console.error(`Error: Missing keys: ${missing_keys.join(', ')}`);
            return;
        }

        const output_stream = fs.createWriteStream(output_file);

        for (let i = 1; i <= chunk_count; i++) {
            const chunkfile_name = `${inputDir}chunk${i}`

            const algorithm = 'aes-256-cbc';
            const key = index_data.keys[i];

            const encrypted_content = await fs.promises.readFile(chunkfile_name);

            const iv = encrypted_content.slice(0, 16);
            const encrypted_data = encrypted_content.slice(16);

            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            let decrypted = Buffer.concat([decipher.update(encrypted_data), decipher.final()]);

            output_stream.write(decrypted);
        }

        output_stream.end(() => {
            console.log(`Combined ${chunk_count} chunk(s) into ${output_file}`);
        });

        output_stream.on('error', (error) => {
            console.error('Write stream error:', error);
        });
    } catch (error) {
        console.error('Error combining chunks:', error);
    }
}

combineChunks();
