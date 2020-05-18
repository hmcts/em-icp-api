import { Sessions } from './models/Sessions';

const actions = require('models/actions')
const socketio = require('socket.io');

const socket = function (server: any, sessions: Sessions) {

  const io = socketio(server, {'origins': '*:*'} );

  io.on('connection', function (client: SocketIO.Socket) {
    console.log('SocketIO client connecting...');

    client.on('join', (data) => {
      const sessionExists = Object.keys(sessions).includes(data.session);

      if (sessionExists) {
        client.join(data.session);
      }
    });

    client.on(actions.UPDATE_SCREEN, (screen) => {
      const session = screen.session;
      const updatedScreen = screen.body;

      io.in(session).emit(actions.SCREEN_UPDATED, updatedScreen);
    });

    client.on('disconnect', () => {
      console.log('SocketIO client disconnected');
    });
  });
};

module.exports = socket;
