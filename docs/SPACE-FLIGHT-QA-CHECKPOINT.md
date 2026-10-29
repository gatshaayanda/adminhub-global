# GGL Space flight controls QA checkpoint

This checkpoint accompanies the latest steering, spawn, camera, and asteroid-dust changes.

## Verify on the deployed build
- Launch away from GGL Haven, with the ship and camera clearly separated from the station.
- Drag the circular analog in every direction; ship steering should respond smoothly and predictably, and the thumb should stay inside the rim.
- Confirm forward and reverse flight still work as expected.
- Confirm asteroid dust has varied drift speeds and directions rather than moving as one synchronized sheet.
- Check both touch controls on mobile and keyboard controls on desktop.

Do not mark this checkpoint ready for QA until the deployment built from the current `main` commit is READY.