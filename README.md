# Nashmi Ride Web

This repository is configured as a web-only deployment for the Nashmi Ride project.

## Live web pages
- Home: `/`
- Passenger: `/passenger`
- Captain: `/captain`
- Control room: `/control-room`

## Run locally

```bash
npm install --prefix darbak-control-room
npm start
```

Then open:
- http://localhost:4000/
- http://localhost:4000/passenger
- http://localhost:4000/captain
- http://localhost:4000/control-room

## Render deployment

Use these settings in Render:

- Build Command: `npm install --prefix darbak-control-room`
- Start Command: `node darbak-control-room/server.js`
- Port: `4000`

## Notes
This project is intentionally converted to a three-page web app and is no longer serving the old native app build routes.
