const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'secure_legal_db.sqlite');
const db = new sqlite3.Database(dbPath);
console.log('Connecting to db:', dbPath);
db.serialize(() => {
    db.all('SELECT id, title, originalFilename, storagePath, fileHash FROM document LIMIT 5', (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Documents:');
            console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
    });
});
