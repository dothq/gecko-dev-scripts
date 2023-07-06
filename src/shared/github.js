import { App } from "octokit";
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";

export const createGH = () => {
    const GitHub = Octokit.plugin(restEndpointMethods);
    const gh = new GitHub({ auth: process.env.ROBOT_TOKEN });

    return gh;
};

export const createGHApp = () => {
    const app = new App({
        appId: process.env.GH_APP_ID,
        privateKey: process.env.GH_APP_KEY,
    });

    return app;
}   