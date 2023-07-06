import ms from "ms";
import { createGHApp } from "./shared/github.js";
import { existsSync, readFileSync, writeFileSync } from "fs";

const main = async () => {
    const app = createGHApp();

    const installation = await app.octokit.request("GET /repos/{owner}/{repo}/installation", {
        owner: "dothq",
        repo: "gecko-dev"
    });

    const octokit = await app.getInstallationOctokit(installation.data.id);

    if (existsSync("/run_id")) {
        await octokit.request("PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}", {
            owner: "dothq",
            repo: "gecko-dev",
            check_run_id: readFileSync("/run_id", "utf-8").trim(),
            conclusion: process.env.CONCLUSION,
            status: "completed",
            output: {
                title: process.env.RUN_NAME,
                summary: process.env.CONCLUSION == "success" 
                    ? `Firefox v${process.env.VERSION} was successfully compiled in ${ms(Date.now() - process.env.START_TIME_MS)}` 
                    : process.env.CONCLUSION == "failure" 
                        ? `Failed to compile`
                        : "Unknown outcome!"
            }
        });
    } else {
        const run = await octokit.request("POST /repos/{owner}/{repo}/check-runs", {
            owner: "dothq",
            repo: "gecko-dev",
            name: process.env.RUN_NAME,
            head_sha: process.env.HEAD_SHA,
            details_url: process.env.DETAILS_URL,
            status: "in_progress",
            output: {
                title: process.env.RUN_NAME,
                summary: `Compiling Firefox v${process.env.VERSION}...`
            }
        });

        writeFileSync("/run_id", run.data.id.toString(), "utf-8");
    }
}

main();