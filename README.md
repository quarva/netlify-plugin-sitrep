# netlify-plugin-sitrep

[![Netlify Status](https://api.netlify.com/api/v1/badges/ed60732d-7271-432e-aada-70397b8f8ccf/deploy-status)](https://app.netlify.com/sites/netlify-build-sitrep/deploys) ![npm (scoped)](https://img.shields.io/npm/v/@quarva/netlify-plugin-sitrep) [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FQuarva%2Fnetlify-plugin-sitrep.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FQuarva%2Fnetlify-plugin-sitrep?ref=badge_shield)

A Netlify build plugin that injects build and deploy information into the DOM for debugging.

[Live demo](https://netlify-build-sitrep.quarva.dev)

![Demo](https://github.com/Quarva/quarva.github.io/blob/master/img/netlify-build-sitrep/demo.gif?raw=true)

## Usage

### Set up your Netlify environment variables

The plugin accesses Netlify's postprocessing snippet injection using the Netlify API, so we need to provide an access token.

1. Sign in to Netlify and navigate to User Settings → [Applications](https://app.netlify.com/user/applications)
2. Generate a new personal access token
3. Store that personal access token as a [build environment variable](https://docs.netlify.com/configure-builds/environment-variables) called `BUILD_SITREP_TOKEN` in the site(s) you want to use the plugin with.

### Install

```bash
npm install --save @quarva/netlify-plugin-sitrep

or 

yarn add @quarva/netlify-plugin-sitrep
```

### Add the plugin to `netlify.toml`

```toml
[[plugins]]
package = "@quarva/netlify-plugin-sitrep"
```

Note: The `[[plugins]]` line is required for each plugin, even if you have other plugins in your `netlify.toml` file already.

### Configuration

By default, the plugin won't inject any data in a production context. You can adjust that with the `allow_prod` input.

```toml 
[[plugins]]
package = "@quarva/netlify-plugin-sitrep"
  [plugins.inputs]  
    "allow_prod" = ""
    # If true, the plugin will inject data even when run in a production context.
    "verbose" = ""
    # If true, the plugin will write each step to the deploy log.
```

### Development

## Required environment variables

These variables need to be set locally. You can do this by temporarily assigning them with `netlify env` or by using `dotenv`.

| Variable Name |Description |
|--- | --- |
|BUILD_SITREP_TOKEN|Must be configured by the user|
|SITE_ID|Must be configured by the user|
|DEPLOY_ID|provided by Netlify, but can be configured by the user|
|BUILD_ID|provided by Netlify, but can be configured by the user|