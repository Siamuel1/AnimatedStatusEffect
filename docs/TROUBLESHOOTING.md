# Troubleshooting

## The plugin does not appear

Check that the filename ends in `.plugin.js`, not `.plugin.js.txt`, and that you placed it in the folder opened by BetterDiscord's **Open Plugins Folder** button. Disable the old SiamStatusRotator if both are installed.

## Cannot access the signed-in session

The plugin relies on a private Discord module. A Discord update can change it. Pause the plugin and report your Discord, BetterDiscord, and plugin versions using the bug report template. Do not paste account tokens or raw request headers.

## Discord rejected the update

A request can fail because the private settings endpoint changed or the account cannot complete the request. The plugin pauses after an error. Record the HTTP status code and error text. Avoid repeatedly restarting it.

## Rate-limited (HTTP 429)

The plugin pauses and saves the cooldown returned by Discord. Waiting is required even if the plugin is restarted. If Discord does not supply a usable wait time, the plugin records a 60-second fallback plus a one-second buffer. That fallback is not a promise that Discord will accept the next update.

The selected 2-10 second interval is a requested pace, not a bypass of server limits. For details, see [Discord's rate-limit documentation](https://docs.discord.com/developers/topics/rate-limits).

## Old status stays visible after pausing

This is expected. The plugin leaves the last status in place. Change or clear it through Discord's normal status menu.

## Status skips steps on another device

Other clients may refresh statuses at different times. The illustrative GIFs show the intended sequence, not guaranteed delivery timing.
