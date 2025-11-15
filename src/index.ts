import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db, uimHandshakes, insertUimHandshakeSchema } from '@tcs-network/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'uim-layer' });
});

app.post('/api/uim/handshake', async (req, res) => {
  try {
    const { systemId, systemName, energyKwh, capabilities } = req.body;
    
    const signature = crypto
      .createHash('sha256')
      .update(`${systemId}-${Date.now()}`)
      .digest('hex');
    
    const solarEquivalent = (parseFloat(energyKwh) / 4913.0).toFixed(6);
    
    const handshake = insertUimHandshakeSchema.parse({
      nodeId: 'tcs-network-foundation-001',
      systemId,
      systemName,
      signature,
      energyKwh,
      solarEquivalent,
      renewableSource: 'SOLAR',
      ethicsScore: 95,
      capabilities: capabilities || [],
      status: 'completed'
    });
    
    const result = await db.insert(uimHandshakes).values(handshake).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Handshake error:', error);
    res.status(500).json({ error: 'Handshake failed' });
  }
});

app.get('/api/uim/handshakes', async (req, res) => {
  try {
    const handshakes = await db.select().from(uimHandshakes).limit(100);
    res.json(handshakes);
  } catch (error) {
    console.error('Error fetching handshakes:', error);
    res.status(500).json({ error: 'Failed to fetch handshakes' });
  }
});

app.listen(PORT, () => {
  console.log(`UIM Layer API running on port ${PORT}`);
});
