import { gt } from "semver";
import { actions, store } from "~/store";
import { updateConfig } from "./helpers";
import { showNotification } from "@mantine/notifications";

export async function runUpdateChecker(lastPromptedVersion: string | null, force: boolean) {
	if (import.meta.env.MODE === "development") {
		return;
	}

	try {
		const response = await fetch("https://api.github.com/repos/StarlaneStudios/Surrealist/releases/latest");
		const result = await response.json();
		const version = result.tag_name.slice(1);
		const current = import.meta.env.VERSION;

		if (version == lastPromptedVersion && !force) {
			return;
		}

		if (gt(version, current)) {
			store.dispatch(actions.setAvailableUpdate(version));
			updateConfig();
		} else if (force) {
			showNotification({
				message: "Surrealist is up-to-date!",
			});
		}
	} catch (err) {
		console.warn("Failed to check for updates", err);
	}
}
