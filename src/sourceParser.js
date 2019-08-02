const downloadMediaFile = require(`./utils`).downloadMediaFile;
const convertFileNodeToFluid = require(`./utils`).convertFileNodeToFluid;
const cheerio = require('cheerio');
const URIParser = require('urijs');
const fs = require(`fs-extra`);
const path = require(`path`);

/**
 * Parses sourced HTML looking for <img> and <a> tags
 * that come from the WordPress uploads folder
 * Copies over files to Gatsby static folder
 * Also does additional processing to "fix" WordPress content
 * - unwraps <p> that contain <img>
 * @param  {string} content               original sourced content
 * @param  {string} uploadsUrl            wordpress uploads url
 * @param  {string} wordPressUrl          wordpress site url
 * @param  {string} pathPrefix            Gatsby pathPrefix
 * @param  {object} params                Gatsby API object
 * @return {string}                       processed HTML
 *
 * sourceParser(source, pluginOptions, params)
 */
module.exports = async function sourceParser(
  { content },
  { uploadsUrl, wordPressUrl, pathPrefix = '', generateWebp = true },
  params,
  context
) {
  const {
    actions,
    store,
    cache,
    reporter,
    createNodeId,
    getNodeAndSavePathDependency,
  } = params;
  const { createNode } = actions;

  if (!content) {
    return '';
  }

  // source: gatsby-source-filesystem/src/extend-file-node.js
  // copies file to the `/static` folder
  const copyToStatic = file => {
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

  const $ = cheerio.load(content, { xmlMode: true });

  let imageRefs = [];
  let pRefs = [];
  let swapSrc = new Map();

  $('a, img').each((i, item) => {
    let url = item.attribs.href || item.attribs.src;
    let urlKey = url;

    if (!url) {
      return;
    }

    // removes protocol to handle mixed content in a page
    let urlNoProtocol = url.replace(/^https?:/i, '');
    let uploadsUrlNoProtocol = uploadsUrl.replace(/^https?:/i, '');
    // gets relative uploads url
    let uploadsUrlRelative = new URIParser(uploadsUrl).path();
    // handling relative url
    const urlParsed = new URIParser(url);
    const isUrlRelative = urlParsed.is('relative');

    // if not relative root url or not matches uploads dir
    if (
      !(isUrlRelative && url.startsWith(uploadsUrlRelative)) &&
      !urlNoProtocol.startsWith(uploadsUrlNoProtocol)
    ) {
      return;
    }

    if (isUrlRelative) {
      url = urlParsed.absoluteTo(wordPressUrl).href();
    }

    imageRefs.push({
      url,
      urlKey,
      name: item.name,
      elem: $(item),
    });

    // wordpress wpautop wraps <img> with <p>
    // this causes react console message when replacing <img> with <Img> component
    // code below unwraps <img> and removes parent <p>
    if (item.name === 'img') {
      $(item)
        .parents('p')
        .each(function(index, element) {
          pRefs.push($(element));
          $(element)
            .contents()
            .insertAfter($(element));
        });
    }
  });

  // deletes <p> elements
  pRefs.forEach(elem => elem.remove());

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

  await Promise.all(
    imageRefs.map(async item => {
      const fileNode = await downloadMediaFile({
        url: item.url,
        cache,
        store,
        createNode,
        createNodeId,
      });

      // non-image files are copied to the `/static` folder
      if (!supportedExtensions[fileNode.extension]) {
        let staticFile = copyToStatic(fileNode);

        swapSrc.set(item.urlKey, {
          src: staticFile,
          id: fileNode.id,
        });

        console.log(`downloaded file ${item.url}`);
        return;
      }

      try {
        const fluidResult = await convertFileNodeToFluid({
          generateWebp,
          fileNode,
          imageOptions,
          reporter,
          cache,
        });

        swapSrc.set(item.urlKey, {
          src: fluidResult.originalImg,
          id: fileNode.id,
          encoded: JSON.stringify(fluidResult),
        });
      } catch (e) {
        console.log('Exception fluid', e);
      }

      console.log(`downloaded image ${item.url}`);
    })
  );

  $('img').each((i, item) => {
    let url = item.attribs.src;
    let swapVal = swapSrc.get(url);
    if (!swapVal) {
      return;
    }

    $(item).attr('src', swapVal.src);
    $(item).attr('data-gts-encfluid', swapVal.encoded);
    $(item).removeAttr('srcset');
    $(item).removeAttr('sizes');
  });

  $('a').each((i, item) => {
    let url = item.attribs.href;
    let swapVal = swapSrc.get(url);
    if (!swapVal) {
      return;
    }

    $(item).attr('href', swapVal.src);
    // prevents converting to <Link> in contentParser
    $(item).attr('data-gts-swapped-href', 'gts-swapped-href');
  });

  return $.html();
};


