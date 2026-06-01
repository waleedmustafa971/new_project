import { Alert } from 'react-native';
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

// Ensure DB instance always exists
const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'chatApp.db', location: 'default' });
  console.log('✅ chatApp Database opened');
  return db;
};

// Open database manually if needed
export const openDatabase = async () => {
  return await getDB();
};

// Initialize tables
export const initDatabase = async () => {
  const database = await getDB();
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS conversations (
      _id TEXT PRIMARY KEY,
      type TEXT,
      partner_id TEXT,
      partner_name TEXT,
      last_msg_id TEXT, 
      last_msg_clientMessageId TEXT,
      last_msg_messagetype TEXT,
      last_msg_msgByUserId TEXT,
      last_msg_deliveredTo TEXT,
      last_msg_seenBy TEXT,
      xgroupid TEXT,
      group_info TEXT,
      last_msg_text TEXT,
      last_msg_seen INTEGER,
      updatedAt TEXT,
      sender_id TEXT,
      sender_name TEXT,
      receiver_id TEXT,
      receiver_name TEXT,
      createdAt TEXT
    )
  `);
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      mongoId TEXT, 
      convoId TEXT,
      sender TEXT,
      receiver TEXT,
      text TEXT,
      imageUrl TEXT,
      audioUrl TEXT,
      videoUrl TEXT,
      status TEXT,
      type TEXT,
      createdAt TEXT,
      msgByUserId TEXT,
      messagetype TEXT,
      deliveredTo TEXT,
      seenBy TEXT,
      replyTo TEXT,
      forwardedFrom TEXT,
      isForwarded INTEGER
    )
  `);
  console.log('✅ Tables initialized');
};

const addColumnIfNotExists = async (table: string, column: string, type = "TEXT") => {
  const db = await getDB();

  const [res] = await db.executeSql(`PRAGMA table_info(${table})`);

  const exists = [];
  for (let i = 0; i < res.rows.length; i++) {
    exists.push(res.rows.item(i).name);
  }

  if (!exists.includes(column)) {
    await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`✅ Column added: ${column}`);
  }
};

// 🔥 SAFE INSERT (NO DUPLICATES)
export const insertMessage = async (msg: any): Promise<any | null> => {
  console.log('db......', msg)
  try {
  const database = await getDB();
   await database.executeSql(
  `INSERT OR REPLACE INTO messages
  (id, convoId, sender, receiver, text, imageUrl, audioUrl, videoUrl, status, type, createdAt, msgByUserId, messagetype, replyTo, forwardedFrom, isForwarded,mongoId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    String(msg.id),
    msg.convoId || `${msg.sender}_${msg.receiver}`,
    msg.sender,
    msg.receiver,
    msg.text || '',
    msg.imageUrl || '',
    msg.audioUrl || '',
    msg.videoUrl || '',
    msg.status || 'pending',
    msg.type || 'private',
    msg.createdAt || new Date().toISOString(),
    msg.msgByUserId || msg.sender,
    msg.messagetype || 'text',

    // ✅ NEW FIELDS
    msg.replyTo || null,
    msg.forwardedFrom || null,
    msg.isForwarded ? 1 : 0,
    msg.mongoId
  ]
);
    // 2️⃣ Fetch the full row we just inserted (or already existed)
    const [results] = await database.executeSql(
      `SELECT * FROM messages WHERE id = ?`,
      [String(msg.id)]
    );

    if (results.rows.length > 0) {
      return results.rows.item(0); // ✅ return the full object
    }

    return null; // Shouldn't happen, but safety fallback
  } catch (e) {
    console.log("🚨 insertMessage error:", e);
    return null;
  }
};

export const updateMessageMongoId = async (id : string, mongoId: string) => {
  try {
    const db = await getDB();

    await db.executeSql(
      `UPDATE messages SET mongoId = ? WHERE id = ?`,
      [mongoId, id]
    );

    console.log("✅ MongoID updated in SQLite:", mongoId);

  } catch (error) {
    console.log("❌ Failed to update mongoId:", error);
  }
};

export const deleteOlddata = async () => {
  try {
    const db = await getDB();
    /*  await db.executeSql(
       `DELETE FROM messages`
     );
     await db.executeSql(
       `DELETE FROM conversations`
     ); */
    Alert.alert(`✅ delete data `);
  } catch (err) {
    console.error(`❌ Failed to delete:`, err);
  }

}

export const DeleteDroptable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(`DROP TABLE IF EXISTS messages`);
    await db.executeSql(`DROP TABLE IF EXISTS conversations`);
    
    return {
      success: true,
      message: "Tables dropped successfully"
    };

  } catch (err) {
    console.error("❌ Failed to delete:", err);

    return {
      success: false,
      message: "Failed to drop tables",
      error: err
    };
  }
};

//DeleteLocalmess
export const DeleteLocalmess = async (id: string) => {
  try {
    const db = await getDB();
    //db
    /*     await db.executeSql(`DROP TABLE IF EXISTS messages`);
       await db.executeSql(`DROP TABLE IF EXISTS conversations`);
       return; */
    await db.executeSql(
      `DELETE FROM messages where id=?`, [id]
    );

    console.log(`✅ delete data ` + id);
  } catch (err) {
    console.error(`❌ Failed to delete:`, err);
  }

}

export const updateAudioUrl = async (id: string, audioUrl: string) => {
  try {
    const db = await getDB();
    await db.executeSql(
      `UPDATE messages SET audioUrl = ? WHERE id = ?`,
      [audioUrl, id]
    );
    console.log(`✅ Updated audioUrl for message ${id}`);
  } catch (err) {
    console.error(`❌ Failed to update audioUrl for message ${id}:`, err);
  }
};


export const updateImageUrl = async (id: string, imageUrl: string) => {
  try {
    const db = await getDB();
    await db.executeSql(
      `UPDATE messages SET imageUrl = ? WHERE id = ?`,
      [imageUrl, id]
    );
    console.log(`✅ Updated imageUrl for message ${id}`);
  } catch (err) {
    console.error(`❌ Failed to update audioUrl for message ${id}:`, err);
  }
};


export const markDeliveredLocally = async (messageId: string, userId: string) => {
  try {
    const db = await getDB();
    await db.executeSql(
      `UPDATE messages SET status = ? WHERE id = ?`,
      ["delivered", messageId]
    );
    console.log("✅ Delivered locally:", messageId);
  } catch (err) {
    console.log("❌ markDeliveredLocally error", err);
  }
};


// Update Status (FIXED)
export const updateMessageStatus = async (id: string, status: string) => {
  console.log('....update status', status)
  const database = await getDB();
  const result = await database.executeSql(
    `UPDATE messages SET status=? WHERE id=?`,
    [status, id]
  );
  console.log("UPdate status Message Rows affected:", result[0].rowsAffected);
};
export const markMessagesSeenLocally = async (me: string) => {
  console.log('seen updated')
  const db = await getDB();
  await db.executeSql(
    `UPDATE messages SET status = 'seen' WHERE msgByUserId != ?`,
    [me]
  );
};

export const markMessagesSeenLocally_new_notupdating = async (
  messageIds: string[],
  me: string
) => {
  const db = await getDB();
  await db.executeSql(
    `UPDATE messages SET status = 'seen' WHERE msgByUserId != ?`,
    [me]
  );
  for (const id of messageIds) {
    const [result] = await db.executeSql(
      `SELECT seenBy FROM messages WHERE id = ?`,
      [id]
    );

    const row = result.rows.item(0);

    let seenBy = row?.seenBy ? JSON.parse(row.seenBy) : [];

    if (!seenBy.includes(me)) {
      seenBy.push(me);
    }

    await db.executeSql(
      `UPDATE messages SET 
        status = 'seen',
        seenBy = ?
       WHERE id = ?`,
      [JSON.stringify(seenBy), id]
    );
  }
};

export const testGetdata = async (
  limit = 20,
  offset = 0
) => {
  const database = await getDB();   
 
 /*  await db.executeSql(`DROP TABLE IF EXISTS messages`);
   await db.executeSql(`DROP TABLE IF EXISTS conversations`);
 */ 
  const [results] = await database.executeSql(
    `SELECT * FROM messages
     ORDER BY datetime(createdAt) DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const rows = results.rows;
  const arr: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    arr.push(rows.item(i));
  }
  console.log("First row:", arr);
  return arr;
};

//testGetdata
export const deleteChathistory = async (
  limit = 20,
  offset = 0
) => {
  const database = await getDB();   
   await database.executeSql(
       `DELETE FROM messages`
     );
};

export const singleReplydata = async (_id: string) => {
  const database = await getDB();   
  const [results] = await database.executeSql(
    `SELECT * FROM messages where id=?`,
    [_id]
  );
  const rows = results.rows;
  const arr: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    arr.push(rows.item(i));
  }
  console.log("single row:", arr);
  return arr;
};


export const loadMessages = async (
  me: string,
  partner: string,
  type: string,
  limit = 20,
  offset = 0
) => {
  const database = await getDB();

  const [results] = await database.executeSql(
    `SELECT * FROM messages 
     WHERE type = ?
     AND (
        (sender = ? AND receiver = ?)
        OR
        (sender = ? AND receiver = ?)
     )
     ORDER BY datetime(createdAt) DESC
     LIMIT ? OFFSET ?`,
    [type, me, partner, partner, me, limit, offset]
  );

  const rows = results.rows;
  const arr: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    arr.push(rows.item(i));
  }
  console.log("First row:", arr);
  return arr;
};

export const checkMessages = async (
  me: string,
  partner: string,
  type: string
) => {
  const database = await getDB();

  const [results] = await database.executeSql(
    `SELECT * FROM messages 
     WHERE sender=? AND receiver=? AND type=? 
     ORDER BY createdAt DESC 
     LIMIT ? OFFSET ?`,
    [me, partner, type]
  );

  const rows = results.rows;
  const arr = [];

  for (let i = 0; i < rows.length; i++) {
    arr.push(rows.item(i));
  }

  return arr;
};


// Pending Messages
export const getPendingMessages = async () => {
  const database = await getDB();
  const [results] = await database.executeSql(
    `SELECT * FROM messages WHERE status='pending'`
  );
  const rows = results.rows;
  console.log('pending message reading count .... ', rows)
  const arr = [];
  for (let i = 0; i < rows.length; i++) {
    arr.push(rows.item(i));
  }
  return arr;
};

// Close database (optional)
export const closeDatabase = async () => {
  if (db) {
    await db.close();
    console.log('✅ Database closed');
    db = null;
  }
};