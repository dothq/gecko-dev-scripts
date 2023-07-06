import { createGHApp } from "./shared/github.js";
import { existsSync, readFileSync, writeFileSync } from "fs";

const main = async () => {
    const args = process.argv.splice(2);

    const { octokit } = createGHApp();

    if (existsSync("/run_id")) {
        await octokit.request("PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}", {
            owner: "dothq",
            repo: "gecko-dev",
            check_run_id: readFileSync("/run_id", "utf-8").trim(),
            conclusion: args[0],
            status: "completed",
        });
    } else {
        const run = await octokit.request("POST /repos/{owner}/{repo}/check-runs", {
            owner: "dothq",
            repo: "gecko-dev",
            name: "build-ff",
            head_sha: args[0],
            details_url: args[1],
            status: "in_progress"
        });

        writeFileSync("/run_id", run.data.id, "utf-8");
    }
}

main();