# Add playable Desert Temple Maze and shared level progression

Adds Level 2 to the approved Forest Amber baseline: a physical 49-cell desert maze with three independent tablet branches, pickaxe-cleared sandstone, a locked temple, three random arithmetic questions and a unique golden-key reward. The level picker supports normal progression and an explicit parent UAT entry; restarting either level preserves the other level's progress.

Includes original camel/fennec/lizard models, short camel guidance, local Mandarin dialogue, three optional quests, a desert accessory, two permanent ore deposits, explored-map tracking, responsive touch controls and paginated cross-level inventory. Migrates schema 1/2 saves to schema 3 and pauses stale tabs when another tab updates progress. Levels 3–6 remain design-only.

Validation: 43 unit tests; successful TypeScript/Vite build; 5 distinct Level 2 browser cases and 8 selected Forest regression cases passed. Real maze traversal verifies collections, retries, reload, gate/chest rewards and level switching. Browser tests also cover native speech playback, touch/camera/resize, Pages subpath assets, WebGL recovery and inventory overflow. iPhone Safari HTTPS hardware, thermal/FPS performance and family voice/visual UAT remain unverified.

- [Implementation and evidence](LEVEL2_IMPLEMENTATION.md)
- [Family UAT checklist](LEVEL2_UAT.md)
- Preview entry: https://deploy-preview-1--wordwood.netlify.app/?level=2
