# Wait for Netlify Deploy — A GitHub Action ⏱

Do you have other Github actions (Lighthouse, Cypress, etc) that depend on the Netlify Preview URL? This action will wait until the preview URL is available before running the next task.

This is a fork of [JosephDuffy/wait-for-netlify-action](https://github.com/JosephDuffy/wait-for-netlify-action) that uses the deployment for the commit, rather than for the PR. This fork fixes a couple issues retrieving the GitHub SHA being built, the deployment commit URL, and `max_timeout` setting.

This action uses the Netlify API to always retrieve the correct deployment being built. You will need to generate a [Personal Access Token](https://app.netlify.com/user/applications/personal) to use and pass it as the `NETLIFY_TOKEN` environment variable.

## Env

### `NETLIFY_TOKEN`

**Required.** Your Netlify [Personal Access Token](https://app.netlify.com/user/applications/personal) to use for API access. This should be set as a GitHub secret, see example.

## Inputs

### `site_name`

**Required** The name of the Netlify site to reach `https://{site_name}.netlify.com`

### `max_timeout`

Optional — The amount of time to spend waiting on Netlify. Defaults to `60` seconds

## Outputs

### `url`

The Netlify deploy preview url that was deployed.

### `site_id`

The Netlify site ID that was deployed.

### `deploy_id`

The Netlify deployment ID that was deployed.

## Example usage

Basic Usage

```yaml
steps:
  - name: Waiting for Netlify Preview
    uses: kamranayub/wait-for-netlify-action@v2.1.0
    id: wait-for-netflify-preview
    with:
      site_name: "YOUR_SITE_NAME"
      max_timeout: 60
    env:
      NETLIFY_TOKEN: ${{secrets.NETLIFY_TOKEN}}
```

<details>
<summary>Complete example with Lighthouse</summary>
<br />

```yaml
name: Lighthouse

on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v1
      - name: Use Node.js 12.x
        uses: actions/setup-node@v1
        with:
          node-version: 12.x
      - name: Install
        run: |
          npm ci
      - name: Build
        run: |
          npm run build
      - name: Waiting for 200 from the Netlify Preview
        uses: kamranayub/wait-for-netlify-action@v2.1.0
        id: wait-for-netflify-preview
        with:
          site_name: "YOUR_SITE_NAME"
        env:
          NETLIFY_TOKEN: ${{secrets.NETLIFY_TOKEN}}
      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.3.x
          lhci autorun --upload.target=temporary-public-storage --collect.url=${{ steps.wait-for-netflify-preview.outputs.url }} || echo "LHCI failed!"
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

</details>
