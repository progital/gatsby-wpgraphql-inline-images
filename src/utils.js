const { createRemoteFileNode } = require('gatsby-source-filesystem');
const { fluid } = require(`gatsby-plugin-sharp`);

const downloadMediaFile = async ({
  url,
  cache,
  store,
  createNode,
  createNodeId,
}) => {
  let fileNode = false;
  try {
    fileNode = await createRemoteFileNode({
      url,
      store,
      cache,
      createNode,
      createNodeId,
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
  pathPrefix
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
  });

  const fluidResult = await fluid({
    file: fileNode,
    args: imageOptions,
    reporter,
    cache,
  });

  return fluidResult;
};

exports.downloadMediaFile = downloadMediaFile;
exports.downloadImage = downloadImage;
