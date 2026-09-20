/**
 * @name AnimatedStatusEffect
 * @author Siam (with ChatGPT assistance)
 * @description Rotate plain-text custom statuses. Personal-account automation carries Discord account risk.
 * @version 1.1.1
 */

// Install: Settings > BetterDiscord > Plugins > Open Plugins Folder.
// Disable the old SiamStatusRotator first. Copy this file there, enable it, and open its settings.
// Choose 2-10 seconds; default is 10. Server cooldowns always take priority.
// Experimental: Discord's private modules and settings endpoint can change.
// No downloads, analytics, eval, or saved authentication tokens.

// Keep the limits here so I don't have to hunt through the settings panel later.
const MIN_INTERVAL_SECONDS = 2;
const MAX_INTERVAL_SECONDS = 10;
const DEFAULT_INTERVAL_SECONDS = 10;
const MAX_STATUS_LENGTH = 128;
const REQUEST_TIMEOUT_MS = 15000;

module.exports = class AnimatedStatusEffect {
    constructor() {
        this.name = "AnimatedStatusEffect";
        this.runId = 0;
        this.lastUpdateAttempt = 0;
        this.cooldownUntil = 0;
        this.enabled = false;
        this.isUpdating = false;
    }

    readSettings() {
        // Bring over my old status list if this is the first run after the rename.
        const saved = BdApi.Data.load(this.name, "settings")
            || BdApi.Data.load("SiamStatusRotator", "settings") || {};
        const savedCooldown = Number(BdApi.Data.load(this.name, "cooldownUntil")) || 0;
        this.cooldownUntil = Math.max(this.cooldownUntil, savedCooldown);

        this.statuses = Array.isArray(saved.statuses)
            ? saved.statuses.filter(text => typeof text === "string" && text.trim() && text.length <= MAX_STATUS_LENGTH)
            : ["Coding in Python", "Learning JavaScript", "Building something new"];
        this.seconds = Math.min(
            MAX_INTERVAL_SECONDS,
            Math.max(MIN_INTERVAL_SECONDS, Math.round(Number(saved.seconds) || DEFAULT_INTERVAL_SECONDS))
        );
    }

    start() {
        this.stop();
        this.enabled = true;
        this.readSettings();
        this.statusIndex = 0;
        this.schedule();
    }

    stop() {
        this.enabled = false;
        // Ignore any unfinished update from the previous run.
        this.runId++;
        clearTimeout(this.timer);
        this.controller?.abort();
        // I leave the last status visible when paused. A request already sent may still finish.
    }

    schedule() {
        if (!this.enabled || !this.statuses.length) {
            return;
        }
        const now = Date.now();
        const intervalRemaining = this.seconds * 1000 - (now - this.lastUpdateAttempt);
        const cooldownRemaining = this.cooldownUntil - now;
        const waitTime = Math.max(0, intervalRemaining, cooldownRemaining);

        // Wait for whichever is longer: my chosen interval or Discord's cooldown.
        this.timer = setTimeout(() => this.rotate(), waitTime);
    }

    rememberCooldown(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return;
        }
        this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + seconds * 1000 + 1000);
        // Restarting the plugin should not reset a cooldown from Discord.
        BdApi.Data.save(this.name, "cooldownUntil", this.cooldownUntil);
    }

    async rotate() {
        if (!this.enabled) {
            return;
        }
        // Let the current request finish before sending another one.
        if (this.isUpdating) {
            this.timer = setTimeout(() => this.rotate(), 1000);
            return;
        }
        const runId = this.runId;
        this.isUpdating = true;
        let requestTimeout;
        try {
            // Discord needs the session token for this update. Keep it here, never in settings or logs.
            const session = BdApi.Webpack.getModule(
                value => typeof value?.getToken === "function",
                { searchExports: true }
            );
            const token = session?.getToken();
            if (!token) throw new Error("Cannot access the signed-in session. Discord may have changed.");

            this.controller = new AbortController();
            const controller = this.controller;
            requestTimeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            this.lastUpdateAttempt = Date.now();
            const response = await fetch("https://discord.com/api/v9/users/@me/settings", {
                method: "PATCH",
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ custom_status: { text: this.statuses[this.statusIndex] } }),
                signal: controller.signal,
                redirect: "error"
            });
            // Server cooldowns take priority over the selected animation speed.
            if (response.headers.get("X-RateLimit-Remaining") === "0") {
                this.rememberCooldown(Number(response.headers.get("X-RateLimit-Reset-After")));
            }
            if (response.status === 429) {
                const details = await response.json().catch(() => ({}));
                const headerWait = Number(response.headers.get("Retry-After")) || 0;
                const responseWait = Number(details.retry_after) || 0;
                const retry = Math.max(headerWait, responseWait);
                this.rememberCooldown(retry || 60);
                throw new Error("Discord rate-limited the update. Rotation paused. Wait before restarting; the server cooldown will still apply.");
            }
            if (!response.ok) throw new Error(`Discord rejected the update (HTTP ${response.status}).`);
            if (runId === this.runId) this.statusIndex = (this.statusIndex + 1) % this.statuses.length;
        } catch (error) {
            if (runId === this.runId && this.enabled) {
                this.stop();
                const message = error.name === "AbortError"
                    ? "The update timed out. Rotation paused."
                    : error.message;
                BdApi.UI.showToast(`${this.name}: ${message}`, {type: "error", timeout: 8000});
            }
        } finally {
            clearTimeout(requestTimeout);
            this.isUpdating = false;
        }
        if (runId === this.runId) this.schedule();
    }

    getSettingsPanel() {
        this.readSettings();
        const panel = document.createElement("div");
        panel.style.cssText = "padding:16px;color:var(--text-normal);display:grid;gap:12px";
        // A small helper keeps the plain HTML settings panel easy to follow.
        const add = (tag, text) => {
            const element = document.createElement(tag);
            if (text) element.textContent = text;
            panel.appendChild(element);
            return element;
        };
        add("p", "One status per line, up to 128 characters each. Rotation replaces your custom status, including its emoji. It runs while desktop Discord and this plugin are active.");
        add("p", "This automates your personal account and can violate Discord's rules. Frequent updates may be rate-limited. Actual changes may take longer than your interval. No interval removes the account risk.");
        const statusLabel = add("label", "Statuses");
        const statusInput = document.createElement("textarea");
        statusInput.rows = 6;
        statusInput.value = this.statuses.join("\n");
        statusInput.style.cssText = "display:block;width:100%;box-sizing:border-box;padding:8px";
        statusLabel.appendChild(statusInput);
        const intervalLabel = add("label", "Seconds between changes (2 to 10)");
        const intervalInput = document.createElement("input");
        intervalInput.type = "number";
        intervalInput.min = String(MIN_INTERVAL_SECONDS);
        intervalInput.max = String(MAX_INTERVAL_SECONDS);
        intervalInput.value = String(this.seconds);
        intervalInput.style.cssText = "display:block;padding:8px";
        intervalLabel.appendChild(intervalInput);
        const save = add("button", "Save and restart rotation");
        save.className = "bd-button";
        save.onclick = () => {
            // Skip blank lines so they don't clear the status between updates.
            const statuses = statusInput.value
                .split(/\r?\n/)
                .map(text => text.trim())
                .filter(Boolean);
            const seconds = Number(intervalInput.value);
            const hasValidStatuses = statuses.length > 0
                && statuses.every(text => text.length <= MAX_STATUS_LENGTH);
            const hasValidInterval = Number.isInteger(seconds)
                && seconds >= MIN_INTERVAL_SECONDS
                && seconds <= MAX_INTERVAL_SECONDS;

            if (!hasValidStatuses || !hasValidInterval) {
                BdApi.UI.showToast("Enter at least one status (128 characters max) and a whole-number interval from 2 to 10.", {type: "error"});
                return;
            }
            BdApi.Data.save(this.name, "settings", {statuses, seconds});
            this.start();
            BdApi.UI.showToast("Saved. Rotation will resume when the interval allows.", {type: "success"});
        };
        const pause = add("button", "Pause rotation");
        pause.className = "bd-button";
        pause.onclick = () => {
            this.stop();
            BdApi.UI.showToast("Rotation paused. Your last status remains set.", {type: "info"});
        };
        return panel;
    }
};
