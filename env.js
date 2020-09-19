const {env} = require('process');
module.exports={
    BUILD_SITREP_TOKEN:env.BUILD_SITREP_TOKEN,
    CONTEXT:env.CONTEXT,
    SITE_ID:env.SITE_ID,
    COMMIT_REF:env.COMMIT_REF,
    DEPLOY_ID:env.DEPLOY_ID,
    BUILD_ID:env.BUILD_ID,
    DEPLOY_URL:env.DEPLOY_URL
};
