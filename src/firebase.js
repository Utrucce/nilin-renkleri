import { getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { get, getDatabase, onValue, ref, remove, set, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCrnrMiAaZDwFu19Ye7Fhn2KDEjqOtXrQQ',
  authDomain: 'gen-lang-client-0718814489.firebaseapp.com',
  projectId: 'gen-lang-client-0718814489',
  storageBucket: 'gen-lang-client-0718814489.firebasestorage.app',
  messagingSenderId: '865723195068',
  appId: '1:865723195068:web:d201cec5803263fe15bab9',
  measurementId: 'G-ZC7GVKGBKL',
  databaseURL: 'https://gen-lang-client-0718814489-default-rtdb.europe-west1.firebasedatabase.app'
};

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export async function connectAnonymously() {
  const credentials = auth.currentUser || (await signInAnonymously(auth)).user;
  return credentials.uid;
}

export function watchRoom(roomCode, callback) {
  return onValue(ref(database, `rooms/${roomCode}`), (snapshot) => callback(snapshot.val()));
}

export async function createRoom(roomCode, password, roomState) {
  const passwordHash = await hashPassword(password);
  await set(ref(database, `rooms/${roomCode}`), { passwordHash, state: roomState, players: {} });
}

export async function verifyRoom(roomCode, password) {
  const snapshot = await get(ref(database, `rooms/${roomCode}`));
  const room = snapshot.val();
  if (!room || room.passwordHash !== await hashPassword(password)) return false;
  return true;
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function writePlayer(roomCode, playerId, player) {
  return update(ref(database, `rooms/${roomCode}/players/${playerId}`), player);
}

export function writeRoomState(roomCode, roomState) {
  return set(ref(database, `rooms/${roomCode}/state`), roomState);
}

export function clearRoom(roomCode) {
  return remove(ref(database, `rooms/${roomCode}`));
}
