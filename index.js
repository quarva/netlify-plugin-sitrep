// Netlify doesn't expose live vars in the CLI, so we need to 
// configure SITE_ID and BUILD_SITREP_TOKEN locally for development
require('dotenv').config()
let ejs = require('ejs');

const fetch = require('node-fetch');
const {
    env: {
        // Must be configured by the user as a Netlify build environment var
        BUILD_SITREP_TOKEN,
        // These are provided by Netlify and are read-only
        CONTEXT,
        SITE_ID,
        COMMIT_REF,
        DEPLOY_ID,
        BUILD_ID,
        DEPLOY_URL
    }
} = require('process')

// Configure the required API vars
let authToken = BUILD_SITREP_TOKEN;
let authString = 'Bearer ' + authToken
let baseURL = `https://api.netlify.com/api/v1/sites/${SITE_ID}/snippets`

module.exports = {
    // Note: we could do all of this in a single event handler (e.g. onSuccess) but
    // we split it up to save as much execution time as possible in the event of
    // an error or misconfiguration.
    
    onPreBuild: ({ inputs, utils: { build: { failPlugin } } }) => {
        // Check inputs
        global.verbose = inputs.verbose;
        let allowProd = inputs.allow_prod;

        if (verbose) console.log('Verbose mode enabled');

        // Make sure the token has been set
        // TODO this probably needs to be more robust
        if (typeof authToken == 'undefined') {
          return failPlugin('The BUILD_SITREP_TOKEN environment var has not been set.');
        }

        // Make sure we don't run in disallowed contexts
        if (verbose) console.log('Verifying allowable contexts...');
        
        if (!allowProd && (CONTEXT == 'production')) {
            return failPlugin('Production debug is disabled. This can be changed in netlify.toml');
        } else {
            if (verbose) console.log('Production debug is enabled. This can be changed in netlify.toml');
        }
    },

    onBuild({ utils: { build: { failPlugin } } }) {

        if (verbose) console.log('Building the tag UI...')

        let COMMIT_REF_truncated = COMMIT_REF.substring(COMMIT_REF.length - 10);

        let data = {build_id: BUILD_ID, context: CONTEXT, commit_ref: COMMIT_REF_truncated, deploy_id: DEPLOY_ID};
        ejs.renderFile(__dirname + '/templates/template.ejs', data, function(err, data) {
            if (err) {  
                return failPlugin ('Something went wrong when processing the display template: ' + err);
            }

            let renderToBase64 = new Buffer.from(data);
            let encodedRender = renderToBase64.toString('base64');
            
            let tagOpen =   '<script>' +
                            'window.onload = function() {' +
                            'var ifrm = document.createElement(\'iframe\');' +
                            'ifrm.setAttribute(\'id\', \'ifrm\');' +
                            'ifrm.setAttribute(\'style\', \'position: fixed; bottom: 0; right: 0; border: 0;\');' +
                            'document.body.appendChild(ifrm);'
                
            let tagData =   'ifrm.setAttribute(\'src\', \'data:text/html;base64,' + encodedRender + '\');'
            let tagClose =    '}' +
                            '</script>'

        global.tagComplete = tagOpen + tagData + tagClose
        if (verbose) console.log('Successfully built the tag UI.')

        });
        },

    async onSuccess({ inputs, utils: { build: { failPlugin, failBuild }, status: { show } } }) {

        if (verbose) console.log('Preparing snippet injection...');

        try {
            
            if (verbose) console.log('Checking to see if a snippet already exists...');

            await fetch(baseURL, { method: 'GET', headers: {'Authorization': authString}})
              .then((res) => {
                 return res.json()
            })

            .then((json) => {
                let findSnippet = json.filter(function(item) {
                    return item.title == "netlify-build-sitrep";
                });
                
                // TODO: this is super sketchy, needs to be addressed
                if (findSnippet === undefined || findSnippet.length == 0) {
                    if (verbose) console.log('Couldn\'t find an existing snippet.');
                    extendedURL = baseURL;
                    fetchMethod = 'POST'
                } else {
                    let snippetID = findSnippet[0]['id'];
                    extendedURL = baseURL + '/' + snippetID;
                    if (verbose) console.log('Found snippet with id: ' + snippetID);
                    fetchMethod = 'PUT'
                }
            })

            const { status, statusText } = await fetch(extendedURL, {
                method: fetchMethod,
                headers: {
                    'Authorization': authString,
                    "Content-type": "application/json",
                    "Accept": "application/json",
                    "Accept-Charset": "utf-8"
                },
                body: JSON.stringify({
                    title: "netlify-build-sitrep",
                    general: tagComplete,
                    general_position: "body",
                })
            })

            if (status == 201) {
                if (verbose) console.log('Snippet was added.');
                let snippetAction = 'added'
            } else if (status == 200) {
                if (verbose) console.log('Snippet was updated.');
                let snippetAction = 'updated'
            } else {
                return failPlugin('Snippet injection failed on an API error. Netlify said: ' + status + statusText);
            }

            return show ({
              title: 'Sitrep injected successfully',
              summary: 'You should be able to see it on ' + DEPLOY_URL,
              text: 'Build ID: ' + BUILD_ID + ' | Site ID: ' + SITE_ID + ' | Commit: ' + COMMIT_REF + ' | Deploy ID: ' + DEPLOY_ID + '',
            })
        } 
          catch (error) {
            return failBuild('Something catastrophic happened.', { error })
          }
    }
}