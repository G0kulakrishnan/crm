import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;

if (!APP_ID || APP_ID === 'your-instantdb-app-id-here') {
  console.error(
    '⚠️ T2GCRM: InstantDB App ID not configured!\n' +
    'Please open the .env file and set VITE_INSTANT_APP_ID to your app ID from https://instantdb.com/dash'
  );
}

const db = init({ appId: APP_ID });

export default db;
