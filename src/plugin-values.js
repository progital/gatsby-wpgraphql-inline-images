module.exports = pathPrefix => {
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

  const supportedExtensions = {
    jpeg: true,
    jpg: true,
    png: true,
    webp: true,
    tif: true,
    tiff: true,
  };

  return {
    imageOptions,
    supportedExtensions,
  };
};
