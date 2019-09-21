const { createRemoteFileNode } = require('gatsby-source-filesystem');
const { fluid } = require(`gatsby-plugin-sharp`);

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
  const imageOptions = {
    maxWidth: 1380,
    wrapperStyle: ``,
    backgroundColor: `white`,
    linkImagesToOriginal: false,
    showCaptions: false,
    withWebp: true,
    tracedSVG: false,
    pathPrefix,
  };

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

exports.downloadMediaFile = downloadMediaFile;
exports.downloadImage = downloadImage;
exports.convertFileNodeToFluid = convertFileNodeToFluid;
