# Talk v100

A clean browser-first messaging app built with Vite and Firebase Authentication + Cloud Firestore.

## Run

`npm install`
`npm run dev`

## Firebase setup

The web app uses the Talk Firebase project's public web configuration. Firebase Authentication (Email/Password) and Cloud Firestore must be enabled. Configure Firestore Security Rules before real use. Never put Firebase Admin service-account JSON or private keys in this repository or browser code.

## Current scope

- Email/password sign-up and sign-in
- User profiles stored in Firestore
- Add a conversation by a person's exact email address
- Realtime one-to-one text messages
- Responsive desktop/tablet/mobile layout

Voice/video calling, push notifications, games and admin console are not enabled in this clean first release. They need separately tested backend/security work.
