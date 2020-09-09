# netlify-plugin-sitrep
[![npm version](https://badge.fury.io/js/%40quarva%2Fnetlify-plugin-sitrep.svg)](https://badge.fury.io/js/%40quarva%2Fnetlify-plugin-sitrep)

A Netlify build plugin that injects build and deploy information into the DOM for debugging.

![Demo](https://github.com/Quarva/quarva.github.io/blob/master/img/netlify-build-sitrep/demo.gif?raw=true)

## Usage

### Set up your Netlify environment variables

The plugin accesses Netlify's postprocessing snippet injection using the Netlify API, so we need to provide an access token.

1. Sign in to Netlify and navigate to User Settings -> [Applications](https://app.netlify.com/user/applications)
2. Generate a new personal access token
3. Store that personal access token as an environment variable called `BUILD_SITREP_TOKEN` in the site(s) you want to use the plugin with.

### Install

```
npm install --save "@quarva/netlify-plugin-sitrep"
```

### Add the plugin to `netlify.toml`

```toml
[[plugins]]
package = "@quarva/netlify-plugin-sitrep"
```

Note: The `[[plugins]]` line is required for each plugin, even if you have other
plugins in your `netlify.toml` file already.

### Configuration

By default, the plugin won't inject any data in a production context. You can adjust that with the `allow_prod` input.

```toml 
[[plugins]]
package = "@quarva/netlify-plugin-sitrep"
  [plugins.inputs]  
    "allow_prod" = "false"
    # If true, the plugin will work in production.
```