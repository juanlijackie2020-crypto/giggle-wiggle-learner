# Wordwood
A desktop-first 3D English-learning prototype for a beginner, designed for parent and child to play together.

## Run
Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci --cache /tmp/wordwood-npm
npm run dev -- --port 5173
```

Use WASD or arrow keys to walk, drag the scene to rotate the camera, and click monsters or location buttons for optional activities. Choose a block colour and place blocks next to the explorer, or build a starter house. New vocabulary and sound activities reward gems. Buy a cat, hat, or golden blocks in the gem shop. Browser local storage retains progress and buildings.

```sh
npm run build
```

English audio uses browser speech synthesis; an installed English voice is needed. The app requires WebGL for 3D. Learning activities still work when WebGL is unavailable. No accounts, microphone recording, or paid transactions. Phonics covers three introductory blending examples; monster encounters currently use untimed colour challenges, rather than chase or combat mechanics. This is a prototype, not a full curriculum.
