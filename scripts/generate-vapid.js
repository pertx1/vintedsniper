#!/usr/bin/env node
'use strict';

// Generates a VAPID key pair for Web Push. Copy the output into your .env.
// Keep the same keys forever: changing them invalidates every existing subscription.

const webpush = require('web-push');

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('# Añade estas líneas a tu .env');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:tu-email@ejemplo.com');
