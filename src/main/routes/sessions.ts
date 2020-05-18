import * as express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../models/Session';
import {Sessions} from '../models/Sessions';

const sessions: Sessions = {};

const router = express.Router();

router.post('/icp/sessions', (req, res) => {
  const newSession: Session = req.body;
  newSession.id = uuidv4();
  sessions[newSession.id] = newSession;
  res.send(newSession);
});

router.get('/icp/sessions/:id', function(req, res) {
  const sessionId: string = req.params.id;
  const session = sessions[sessionId];
  res.send(session);
});

module.exports = router;
module.exports.sessions = sessions;
