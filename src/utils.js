const { createRemoteFileNode } = require('gatsby-source-filesystem');
const { fluid } = require(`gatsby-plugin-sharp`);
const fs = require(`fs-extra`);
const path = require(`path`);
const getPluginValues = require(`./plugin-values`);

// all-in-one function that is not used
const downloadImage = async (
  url,
  {
    actions,
    store,
    cache,
    reporter,
    createNodeId,
    getNodeAndSavePathDependency,
  },
  pathPrefix,
  generateWebp = true,
  httpHeaders = {}
) => {
  const { createNode } = actions;

  const { imageOptions } = getPluginValues(pathPrefix);

  const fileNode = await downloadMediaFile({
    url,
    cache,
    store,
    createNode,
    createNodeId,
    httpHeaders,
  });

  const fluidResult = await convertFileNodeToFluid({
    generateWebp,
    fileNode,
    imageOptions,
    reporter,
    cache,
  });

  return fluidResult;
};

// downloads media file to gatsby folder
const downloadMediaFile = async ({
  url,
  cache,
  store,
  createNode,
  createNodeId,
  httpHeaders = {},
}) => {
  let fileNode = false;
  try {
    fileNode = await createRemoteFileNode({
      url,
      store,
      cache,
      createNode,
      createNodeId,
      httpHeaders,
    });
  } catch (e) {
    console.log('FAILED to download ' + url);
  }

  return fileNode;
};

// generates fluid object (gatsby-image) from the file node
const convertFileNodeToFluid = async ({
  generateWebp = true,
  fileNode,
  imageOptions,
  reporter,
  cache,
}) => {
  let fluidResult = await fluid({
    file: fileNode,
    args: imageOptions,
    reporter,
    cache,
  });

  if (generateWebp) {
    const fluidWebp = await fluid({
      file: fileNode,
      args: { ...imageOptions, toFormat: 'webp' },
      reporter,
      cache,
    });

    fluidResult.srcSetWebp = fluidWebp.srcSet;
  }

  return fluidResult;
};

// source: gatsby-source-filesystem/src/extend-file-node.js
// copies file to the `/static` folder
const copyToStatic = ({
  file,
  getNodeAndSavePathDependency,
  context,
  pathPrefix,
}) => {
  const details = getNodeAndSavePathDependency(file.id, context.path);
  const fileName = `${file.name}-${file.internal.contentDigest}${details.ext}`;

  const publicPath = path.join(process.cwd(), `public`, `static`, fileName);

  if (!fs.existsSync(publicPath)) {
    fs.copy(details.absolutePath, publicPath, err => {
      if (err) {
        console.error(
          `error copying file from ${details.absolutePath} to ${publicPath}`,
          err
        );
      }
    });
  }

  return `${pathPrefix}/static/${fileName}`;
};

// helper function for logging messages
const debugLog = (debugOutput, ...args) => {
  debugOutput && console.log(...args);
};

module.exports = {
  downloadMediaFile,
  downloadImage,
  convertFileNodeToFluid,
  debugLog,
  copyToStatic,
};
