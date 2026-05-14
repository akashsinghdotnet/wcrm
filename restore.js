const mysql = require('mysql2/promise');

async function main() {
  const db = await mysql.createConnection({
    host: '127.0.0.1', user: 'magnetcrmuser', password: 'rYdGN7WqubV7KWEShUSJ', database: 'magnetcrm'
  });

  const [messages] = await db.query('SELECT id, direction, content, createdAt FROM whatsapp_messages WHERE leadId IS NULL');
  console.log(`Found ${messages.length} messages with NULL leadId`);

  const [activities] = await db.query('SELECT leadId, content, createdAt, type FROM activities WHERE type="WHATSAPP"');

  let updated = 0;
  for (const m of messages) {
    let matchedLeadId = null;

    // Try finding by exact timestamp proximity (within 3 seconds)
    const mTime = new Date(m.createdAt).getTime();
    const closeActivities = activities.filter(a => Math.abs(new Date(a.createdAt).getTime() - mTime) < 3000);

    if (closeActivities.length === 1) {
      matchedLeadId = closeActivities[0].leadId;
    } else if (closeActivities.length > 1) {
        // Tie-break by content
        const mContent = String(m.content || '').substring(0, 50).trim();
        const best = closeActivities.find(a => String(a.content || '').includes(mContent));
        if (best) matchedLeadId = best.leadId;
        else matchedLeadId = closeActivities[0].leadId; 
    } else {
        // Fallback: search across all activities by EXACT content match
        const mContent = String(m.content || '').substring(0, 100).trim();
        if (mContent.length > 5) {
            const matches = activities.filter(a => String(a.content || '').includes(mContent));
            if (matches.length > 0) matchedLeadId = matches[0].leadId;
        }
    }

    if (matchedLeadId) {
       await db.query('UPDATE whatsapp_messages SET leadId = ? WHERE id = ?', [matchedLeadId, m.id]);
       updated++;
    }
  }

  console.log(`Successfully restored leadId for ${updated} messages!`);
  db.end();
}
main().catch(e => console.error(e));
