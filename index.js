/* eslint-disable no-console, no-await-in-loop  */
const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

function getNetlifyUrl(url) {
  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    },
  });
}

const waitForUrl = async (url, MAX_TIMEOUT) => {
  const iterations = MAX_TIMEOUT / 3;
  for (let i = 0; i < iterations; i += 1) {
    try {
      await axios.get(url);
      console.log('Url fetch completed, done!');
      return;
    } catch (e) {
      console.log('Url unavailable, retrying...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  core.setFailed(`Timeout reached: Unable to connect to ${url}`);
};

const run = async () => {
  try {
    const netlifyToken = process.env.NETLIFY_TOKEN;
    // In a PR, github.contex.sha refers to the last merge commit SHA
    // not the *latest commit* of the PR which is what Netlify uses. Instead,
    // have to use github.context.payload.pull_request.head.sha
    // See: https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request
    const isPr = 'pull_request' in github.context.payload;
    const commitSha = isPr ? github.context.payload.pull_request.head.sha : github.context.sha;
    const MAX_TIMEOUT = Number(core.getInput('max_timeout')) || 60;
    const siteName = core.getInput('site_name');
    if (!netlifyToken) {
      core.setFailed('Please set NETLIFY_TOKEN env variable to your Netlify Personal Access Token secret');
    }

    if (!commitSha) {
      core.setFailed('Could not determine GitHub commit');
    } else {
      console.log('Using SHA', commitSha, isPr ? 'from PR' : '');
    }
    if (!siteName) {
      core.setFailed('Required field `site_name` was not provided');
    }

    const { data: netlifySites } = await getNetlifyUrl(
      `https://api.netlify.com/api/v1/sites?filter=all&name=${siteName}`,
    );
    if (!netlifySites || netlifySites.length === 0) {
      core.setFailed(`Could not find Netlify site with the name ${siteName}`);
    }
    const { site_id: siteId } = netlifySites.find((site) => site.name === siteName);
    core.setOutput('site_id', siteId);

    const { data: netlifyDeployments } = await getNetlifyUrl(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`);

    if (!netlifyDeployments) {
      core.setFailed('Failed to get deployments for site');
    }

    // Most likely, it's the first entry in the response
    // but we correlate it just to be safe
    const commitDeployment = netlifyDeployments.find(
      (d) => d.commit_ref === commitSha && d.context === (isPr ? 'deploy-preview' : 'production'),
    );
    if (!commitDeployment) {
      core.setFailed(`Could not find deployment for commit ${commitSha}`);
    }
    core.setOutput('deploy_id', commitDeployment.id);

    // At this point, we have enough info to where
    // we could wait for the deployment state === "ready"
    // but it's probably more reliable to wait for the URL
    // to be available.
    //
    // This could be enhanced to wait for the deployment status
    // and then wait once again for the URL to return 200.
    const url = `https://${commitDeployment.id}--${siteName}.netlify.app`;
    core.setOutput('url', url);
    console.log(`Waiting for a 200 from: ${url}`);
    await waitForUrl(url, MAX_TIMEOUT);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
