import { compareVersions } from "compare-versions";
import axios from "axios";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import hbs from "handlebars";
import { createGH } from "./shared/github";

async function main() {
    const args = process.argv.splice(2);
    const [prevCheckedVersion] = args;

    const versions = (await axios.get("https://product-details.mozilla.org/1.0/firefox_versions.json")).data;

    const currentVersion = versions.LATEST_FIREFOX_VERSION;

    const result = compareVersions(currentVersion, prevCheckedVersion ? prevCheckedVersion : currentVersion);

    if (!result) {
        console.log("No changes yet.");
        process.exit(1);
    }

    writeFileSync(resolve(process.cwd(), "current_version.txt"), currentVersion);

    const gh = createGH();

    const common = {
        owner: "dothq",
        repo: "gecko-dev",
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    }

    const bodyFile = readFileSync(resolve(process.cwd(), "UPSTREAM_PULL_TEMPLATE.md"), "utf-8")
    const body = hbs.compile(bodyFile)({ version: currentVersion })

    const pr = await gh.request("POST /repos/{owner}/{repo}/pulls", {
        ...common,
        head: "mozilla:release",
        head_repo: "gecko-dev",
        base: "release",
        maintainer_can_modify: false,
        title: `v${currentVersion}`,
        body
    })

    const assigneesFile = (await axios.get("https://raw.githubusercontent.com/dothq/browser-desktop/nightly/build/ci/MERGEDAY_ASSIGNEES.txt")).data;
    const allAssignees = assigneesFile.replace(/#.*/gm, "").split("\n").filter(Boolean);
    const assignees = allAssignees.filter(u => u).map(u => u.replace(/\!/g, ""))
    const reviewers = allAssignees.filter(u => u.startsWith("!!!")).map(u => u.replace(/\!/g, ""))
    
    await gh.request("POST /repos/{owner}/{repo}/issues/{issue_number}/assignees", {
        ...common,
        issue_number: pr.data.number,
        assignees
    });

    await gh.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
        ...common,
        pull_number: pr.data.number,
        reviewers
    });

    console.log("Pull request has been made.")

    const scriptsRepo = await gh.request("GET /repos/{owner}/{repo}", {
        owner: "dothq",
        repo: "gecko-dev-scripts"
    });

    await gh.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", {
        owner: "dothq",
        repo: "gecko-dev-scripts",
        workflow_id: "build-ff",
        ref: scriptsRepo.data.default_branch,
        inputs: {
            revision: pr.data.head.sha
        }
    });

    console.log("Build dispatch is in progress...")
}

main();