# Account risks

This is an experimental personal-account automation plugin, not an approved Discord bot.

## Enforcement

[Discord prohibits automating normal user accounts outside its supported OAuth2/bot API](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots) and says it can terminate accounts. A two-second interval is about 30 update attempts per minute; a ten-second interval is about six. Neither interval makes the automation permitted or guarantees account safety. No reliable ban probability is available here.

## Account compromise

A shorter interval does not itself steal an account. The concern is code running in the signed-in client: a malicious plugin could access credentials or session data. This plugin reads a session token to authenticate the status update directly to Discord. It does not save or log that token, download executable code, or send data to an outside service. This does not certify the security of BetterDiscord, other installed plugins, or modified copies.

Do not post tokens, private configuration files, or raw authenticated requests in GitHub issues. Two-factor authentication is useful account protection but should not be treated as permission to trust arbitrary code in a signed-in client.

## Reliability

Server limits may delay or reject changes. Private Discord modules and endpoints may change. A successful syntax or simulated test does not prove the plugin works in a current Discord client.

I would avoid using this on a main account whose access matters to you.
