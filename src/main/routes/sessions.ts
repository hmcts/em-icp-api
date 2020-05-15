import * as express from 'express';
import { v4 as uuidv4 } from 'uuid';

interface Session {
  id: string;
  description: string;
  dateOfHearing: Date;
  documents: string[];
  participants: string[];
}

const db: { [key: string]: Session } = {};

const router = express.Router();

router.post('/icp/sessions', (req, res) => {
  const newSession: Session = req.body;
  newSession.id = uuidv4();
  db[newSession.id] = newSession;
  res.send(newSession);
});

router.get('/icp/sessions/:id', function(req, res) {
  const sessionId: string = req.params.id;
  const session = db[sessionId];
  res.send(session);
});

module.exports = router;
