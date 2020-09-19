const ejs = require('ejs');
const fetch = require('node-fetch');
const env = require('./env');

// Configure the required API vars
const NETLIFY_API_VERSION = 'v1';
const authToken = env.BUILD_SITREP_TOKEN;
const authString = 'Bearer ' + authToken
const baseURL = `https://api.netlify.com/api/${NETLIFY_API_VERSION}/sites/${env.SITE_ID}/snippets`

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

    /**
     * NOTE:
     * we could do all of this in a single event handler (e.g. onSuccess) but
     * we split it up to save as much execution time as possible in the event of
     * an error or misconfiguration.
     */
    onPreBuild: ({ inputs, utils: { build: { failPlugin } } }) => {
        // Check inputs
        global.verbose = inputs.verbose;
        const allowProd = inputs.allow_prod;
        Logger.debug('Verbose mode enabled');
        /**
         * Make sure the token has been set
         * Hopefully we get access to this via build in the future
         */
        if (!isValidString(authToken)) {
          return failPlugin('The BUILD_SITREP_TOKEN environment var has not been set.');
        }
        /**
         * Make sure we don't run in disallowed contexts
         */
        Logger.debug('Verifying allowable contexts...');
        if (!allowProd && env.CONTEXT === PRODUCTION) {
            return failPlugin('Production debug is disabled. This can be changed in netlify.toml');
        }
        Logger.debug('Production debug is enabled. This can be changed in netlify.toml');
    },
    onBuild({ utils: { build: { failPlugin } } }) {
        Logger.debug('Building the tag UI...');
        const data = {build_id: env.BUILD_ID, context: env.CONTEXT, commit_ref: env.COMMIT_REF, deploy_id: env.DEPLOY_ID};
        ejs.renderFile(__dirname + '/templates/template.ejs', data, function(err, data) {
            if (err) {
                return failPlugin ('Something went wrong when processing the display template: ' + err);
            }
            const renderToBase64 = new Buffer.from(data);
            const encodedRender = renderToBase64.toString('base64');
            /**
             * This looks insane, but since snippet injection isn't exposed
             * to build plugins, we have to use the API and pass data that
             * can run without further processing. The only alternative is
             * to modify the filesystem, which we don't want.
             */
            const tagOpen =   '<script>' +
                            'window.onload = function() {' +
                            'var ifrm = document.createElement(\'iframe\');' +
                            'ifrm.setAttribute(\'id\', \'ifrm\');' +
                            'ifrm.setAttribute(\'style\', \'position: fixed; bottom: 0; right: 0; border: 0;\');' +
                            'document.body.appendChild(ifrm);'
            const tagData =   'ifrm.setAttribute(\'src\', \'data:text/html;base64,' + encodedRender + '\');'
            const tagClose =    '}' +
                            '</script>'
            global.tagComplete = tagOpen + tagData + tagClose
            Logger.debug('Successfully built the tag UI.')
        });
        },

    async onSuccess({ inputs, utils: { build: { failPlugin, failBuild }, status: { show } } }) {
        try {
            Logger.debug('Preparing snippet injection...');
            Logger.debug('Checking to see if a snippet already exists...');
            const opts = {
                extendedURL:undefined,
                fetchMethod:undefined
            };
            const response = await fetch(baseURL, { method: 'GET', headers: {'Authorization': authString}});
            const json = await response.json();
            const snippets = await json.filter((item)=>{return item.title == "netlify-build-sitrep";});
            if(!!snippets){
                Logger.debug('Couldn\'t find an existing snippet.');
                opts.extendedURL=baseURL;
                opts.fetchMethod='POST';
            }else{
                const snippetID = snippets[0].id;
                opts.extendedURL = baseURL + '/' + snippetID;
                opts.fetchMethod='PUT';
                Logger.debug('Found snippet with ID: '+snippetID);
            };

            const { status, statusText } = await fetch(opts.extendedURL, {
                method: opts.fetchMethod,
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
            switch (status) {
                case 201:
                    Logger.debug('Snippet was added.');
                    break;
                case 200:
                    Logger.debug('Snippet was updated.');
                    break;
                default:
                    return failPlugin('Snippet injection failed on an API error. Netlify said: ' + status + statusText);
            }

            return show ({
              title: 'Sitrep injected successfully',
              summary: 'You should be able to see it on ' + env.DEPLOY_URL,
              text: 'Build ID: ' + env.BUILD_ID +
                  ' | Site ID: ' + env.SITE_ID +
                  ' | Commit: ' + env.COMMIT_REF +
                  ' | Deploy ID: ' + env.DEPLOY_ID,
            });
        }
          catch (error) {
            return failBuild('Something catastrophic happened.', { error })
          }
    }
}
