const ejs = require('ejs');
const fetch = require('node-fetch');
const env = require('./env');

// Configure the required API vars
let authToken = env.BUILD_SITREP_TOKEN;
let authString = 'Bearer ' + authToken
let baseURL = `https://api.netlify.com/api/v1/sites/${env.SITE_ID}/snippets`

const isValidString = (value)=> !!value&&value!=='';
const Logger = {
    info:console.log,
    debug:(message)=>{
        if(verbose){
            console.debug(message);
        }
    },
    error:console.error
};
const PRODUCTION = 'production';

module.exports = {

    // Note: we could do all of this in a single event handler (e.g. onSuccess) but
    // we split it up to save as much execution time as possible in the event of
    // an error or misconfiguration.

    onPreBuild: ({ inputs, utils: { build: { failPlugin } } }) => {
        // Check inputs
        global.verbose = inputs.verbose;
        let allowProd = inputs.allow_prod;
        Logger.debug('Verbose mode enabled');
        // Make sure the token has been set
        // Hopefully we get access to this via build in the future
        if (isValidString(authToken)) {
          return failPlugin('The BUILD_SITREP_TOKEN environment var has not been set.');
        }
        // Make sure we don't run in disallowed contexts
        Logger.debug('Verifying allowable contexts...');
        if (!allowProd && env.CONTEXT === PRODUCTION) {
            return failPlugin('Production debug is disabled. This can be changed in netlify.toml');
        }
        Logger.debug('Production debug is enabled. This can be changed in netlify.toml');
    },
    onBuild({ utils: { build: { failPlugin } } }) {
        Logger.debug('Building the tag UI...');

        let data = {build_id: env.BUILD_ID, context: env.CONTEXT, commit_ref: env.COMMIT_REF, deploy_id: env.DEPLOY_ID};
        ejs.renderFile(__dirname + '/templates/template.ejs', data, function(err, data) {
            if (err) {
                return failPlugin ('Something went wrong when processing the display template: ' + err);
            }

            let renderToBase64 = new Buffer.from(data);
            let encodedRender = renderToBase64.toString('base64');

            // This looks insane, but since snippet injection isn't exposed
            // to build plugins, we have to use the API and pass data that
            // can run without further processing. The only alternative is
            // to modify the filesystem.
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

            if (verbose && (status == 201)) {
                console.log('Snippet was added.');
            } else if (verbose && (status == 200)) {
                console.log('Snippet was updated.');
            } else if (status !== 200 && 201) {
                return failPlugin('Snippet injection failed on an API error. Netlify said: ' + status + statusText);
            }

            return show ({
              title: 'Sitrep injected successfully',
              summary: 'You should be able to see it on ' + env.DEPLOY_URL,
              text: 'Build ID: ' + env.BUILD_ID + ' | Site ID: ' + env.SITE_ID + ' | Commit: ' + env.COMMIT_REF + ' | Deploy ID: ' + env.DEPLOY_ID + '',
            })
        }
          catch (error) {
            return failBuild('Something catastrophic happened.', { error })
          }
    }
}
