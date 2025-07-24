export enum Actions {
  UPDATE_SCREEN = "IcpUpdateScreen",
  SCREEN_UPDATED = "IcpScreenUpdated",
  CLIENT_JOINED = "IcpClientJoinedSession",
  REMOVE_PARTICIPANT = "IcpRemoveParticipantFromList",
  PARTICIPANTS_UPDATED = "IcpParticipantsListUpdated",
  PRESENTER_UPDATED = "IcpPresenterUpdated",
  UPDATE_PRESENTER = "IcpNewPresenterStartsPresenting",
  CLIENT_DISCONNECTED = "IcpClientDisconnectedFromSession",
  NEW_PARTICIPANT_JOINED = "IcpNewParticipantJoinedSession",
  SESSION_JOIN = "IcpClientJoinSession",
  SESSION_LEAVE = "IcpClientLeaveSession",
  PARTICIPANT_LEFT_SESSION = "IcpParticipantLeftSession",
}
