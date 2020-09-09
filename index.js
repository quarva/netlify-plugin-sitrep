// TODO 
// README

// Netlify doesn't expose live vars in the CLI, so we need to 
// confgure SITE_ID and BUILD_SITREP_TOKEN locally for development
require('dotenv').config()
let ejs = require('ejs');

const fetch = require('node-fetch');
const {
    env: {
        // Must be configured by the user as a Netlify environment var
        BUILD_SITREP_TOKEN,
        // These are provided by Netlify and are read-only
        CONTEXT,
        SITE_ID,
        COMMIT_REF,
        DEPLOY_ID,
        BUILD_ID
    }
} = require('process')

// Configure the required API vars
let authToken = BUILD_SITREP_TOKEN;
let authString = 'Bearer ' + authToken
let baseURL = `https://api.netlify.com/api/v1/sites/${SITE_ID}/snippets`

module.exports = {
    onPreBuild: ({ inputs, utils: { build: { failPlugin } } }) => {
        // Make sure the token has been set
        if (typeof authToken == 'undefined') {
          return failPlugin('The BUILD_SITREP_TOKEN environment var has not been set.');
        }

        // Make sure we don't run in disallowed contexts
        console.log('Verfying allowable contexts...');
        
        let allow_prod = inputs.allow_prod;
        switch (allow_prod) {
            case 'false':
                if (CONTEXT == 'production') {
                    return failPlugin('Production debug is disabled. This can be changed in netlify.toml');
                    break;
                }
            case 'true':
                console.log('Production debug is enabled. This can be changed in netlify.toml')
                break;
        }
    },

    onBuild({ utils: { build: { failPlugin } } }) {
        console.log('Building the tag UI...')

        let data = {build_id: BUILD_ID, context: CONTEXT, commit_ref: COMMIT_REF, deploy_id: DEPLOY_ID};
        let output = ejs.renderFile(__dirname + '/templates/template.ejs', data, function(err, data) {
            if (err) {
                return failPlugin ('Something went wrong when processing the display template.');
            }

            let renderToBase64 = new Buffer.from(data);
            let encodedRender = renderToBase64.toString('base64');
            
            var tagOpen =   '<script>' +
                            'window.onload = function() {' +
                            'var ifrm = document.createElement(\'iframe\');' +
                            'ifrm.setAttribute(\'id\', \'ifrm\');' +
                            'ifrm.setAttribute(\'style\', \'position: fixed; bottom: 0; right: 0; border: 0;\');' +
                            'document.body.appendChild(ifrm);'
                
            var tagData =   'ifrm.setAttribute(\'src\', \'data:text/html;base64,' + encodedRender + '\');'
            var tagEnd =    '}' +
                            '</script>'

        global.tagComplete = tagOpen + tagData + tagEnd
        console.log('Successfully built the tag UI.')

        });
        },

    async onSuccess({ utils: { build: { failPlugin, failBuild } } }) {

        console.log('Here we go...');

        try {
            
            console.log('Checking to see if a snippet already exists...');

            await fetch(baseURL, { method: 'GET', headers: {'Authorization': authString}})
              .then((res) => {
                 return res.json()
            })

            .then((json) => {
                var findSnippet = json.filter(function(item) {
                    return item.title == "netlify-build-sitrep";
                });
                
                // TODO: this is super sketchy, needs to be addressed
                if (findSnippet === undefined || findSnippet.length == 0) {
                    console.log('Couldn\'t find an existing snippet.');
                    extendedURL = baseURL;
                    fetchMethod = 'POST'
                } else {
                    var snippetID = findSnippet[0]['id'];
                    extendedURL = baseURL + '/' + snippetID;
                    console.log('Found snippet with id: ' + snippetID);
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
                console.log('Snippet was added.');
            } else if (status == 200) {
                console.log('Snippet was updated.');
            } else {
                return failPlugin('Something went wrong. Netlify said: ' + status + statusText);
            }
        } 
          catch (error) {
            return failBuild('Something catastrophic happened.', { error })
          }
    }
}