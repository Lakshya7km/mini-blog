import socket from './socket';

/** Join a validated Socket.io room (e.g. hospital:HOSP-001). */
export function joinRoom(room) {
  if (!room) return;
  socket.emit('join', room);
}

export function joinHospital(hospitalId) {
  joinRoom(`hospital:${hospitalId}`);
}

export function joinPharmacy(pharmacyId) {
  joinRoom(`pharmacy:${pharmacyId}`);
}

export function joinClinic(clinicId) {
  joinRoom(`clinic:${clinicId}`);
}
