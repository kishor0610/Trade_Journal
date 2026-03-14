# Panda Login Rive Setup

This project now includes the frontend wiring for a Rive-powered panda login animation.

## 1. State Machine (required)

Create a state machine in Rive named `LoginMachine` with these states and transitions:

| State | Trigger | Animation |
|---|---|---|
| Idle | Page load | Panda breathing/blinking |
| Look | Email hover/focus | Panda turns head |
| Track | Typing email | Eyes follow cursor/input |
| HideEyes | Password focus | Panda covers eyes |
| Error | Wrong password | Panda shocked |
| Success | Login success | Panda jumps |

State machine inputs required by the React integration:

- `isLooking` (Boolean)
- `isTracking` (Boolean)
- `isPassword` (Boolean)
- `loginError` (Trigger)
- `loginSuccess` (Trigger)
- `cursorX` (Number, expected range 0-100)

## 2. Rive Artboard Setup

Create bones/nodes for:

- `head`
- `leftEye`
- `rightEye`
- `leftHand`
- `rightHand`
- `body`

Create animations with these names:

- `idle`
- `look`
- `track`
- `hideEyes`
- `shock`
- `jump`

Export file as:

- `panda_login.riv`

Place the exported file at:

- `frontend/public/panda_login.riv`

## 3. Dependency

Installed package:

- `@rive-app/react-canvas`

## 4. React Integration (already implemented)

Files:

- `frontend/src/components/PandaLogin.jsx`
- `frontend/src/pages/Login.js`

Behavior implemented:

- Email hover/focus -> `isLooking = true`
- Email typing -> `isTracking = true`; `cursorX` updates from typed length and mouse movement
- Password focus -> `isPassword = true`
- Login error -> `loginError.fire()`
- Login success -> `loginSuccess.fire()` before redirect

## 5. Cursor Tracking

Global mouse tracking is wired in `PandaLogin.jsx`:

- On `mousemove`, cursor position is normalized using:
  - `percent = (e.clientX / window.innerWidth) * 100`
- `cursorX` is clamped to `0..100`

## 6. Login Validation Hooking

Already wired in `frontend/src/pages/Login.js`:

- Failed auth path calls panda `loginError()`
- Successful auth path calls panda `loginSuccess()` then redirects

## 7. UI Layout

Clean layout styles added in `frontend/src/index.css`:

- `.panda-login-stack`
- `.panda` (220px height)
- Scoped input styling under `.panda-login-stack input`

## 8. Expected UX

| Action | Panda Reaction |
|---|---|
| Page loads | Panda idle/blinking |
| Hover email | Panda looks |
| Typing email | Eyes track movement |
| Password click | Panda covers eyes |
| Wrong login | Panda shocked |
| Success | Panda jumps |
