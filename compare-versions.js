import { compareVersions } from "compare-versions";
import axios from "axios";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { readFileSync } from "fs";
import { resolve } from "path";
import hbs from "handlebars";

async function main() {
    const args = process.argv.splice(2);
    const [prevCheckedVersion] = args;

    const versions = (await axios.get("https://product-details.mozilla.org/1.0/firefox_versions.json")).data;

    const currentVersion = versions.LATEST_FIREFOX_VERSION;

    const result = compareVersions(currentVersion, prevCheckedVersion ? prevCheckedVersion : currentVersion);

    if (!result) {
        console.log("No changes yet.")
        process.exit(1);
    }

    const GitHub = Octokit.plugin(restEndpointMethods);
    const gh = new GitHub({ auth: process.env.ROBOT_TOKEN });

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
    const assignees = allAssignees.filter(u => !u.startsWith("!!!"))
    const reviewers = allAssignees.filter(u => u.startsWith("!!!"))

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
}

main();