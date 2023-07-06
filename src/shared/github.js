import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";

export const createGH = () => {
    const GitHub = Octokit.plugin(restEndpointMethods);
    const gh = new GitHub({ auth: process.env.ROBOT_TOKEN });

    return gh;
};