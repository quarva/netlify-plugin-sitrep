# netlify-plugin-sitrep
A Netlify build plugin to display debug information in dev or staging environments

# Install

Please install this plugin from the Netlify app.

Create an application token and store it as an environment variable called `BUILD_SITREP_TOKEN`

# Configuration

The following `inputs` options are available.

name: `allow_prod`
description: If true, debug data will be injected in the production context.

[[plugins]]
package = "."
  [plugins.inputs]  
    "allow_prod" = "true"