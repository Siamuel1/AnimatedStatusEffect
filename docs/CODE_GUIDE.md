# Following the code

The installable plugin stays in one JavaScript file. There is no build step or dependency install.

| Part | Purpose |
| --- | --- |
| Constants | Interval limits, maximum text length, and request timeout |
| `readSettings()` | Load saved values and fall back to the old plugin's settings |
| `start()` / `stop()` | Start a new sequence or cancel pending work |
| `schedule()` | Wait for both the selected interval and any server cooldown |
| `rememberCooldown()` | Save the next allowed request time |
| `rotate()` | Send one update, move to the next line, and handle errors |
| `getSettingsPanel()` | Build the text box, interval input, and buttons |

`runId` keeps an old request from continuing a newer sequence after a restart. `isUpdating` prevents overlapping requests. The session token is obtained inside `rotate()` and used only for the direct Discord request. It is not saved in settings or logs.

## Checks

Run `node --check AnimatedStatusEffect.plugin.js` to check JavaScript syntax. Node alone cannot run the plugin because `BdApi` and the Discord environment are required.

Previous simulated checks covered interval boundaries, saving settings, rotation, pausing, and rate-limit handling. They do not establish live compatibility. Any future live verification should record the exact Discord and BetterDiscord versions tested.
