const {
  downloadMediaFile,
  convertFileNodeToFluid,
  copyToStatic,
} = require(`./utils`);
const cheerio = require('cheerio');
const URIParser = require('urijs');
const getPluginValues = require(`./plugin-values`);

/**
 * Parses sourced HTML looking for <img> and <a> tags
 * that come from the WordPress uploads folder
 * Copies over files to Gatsby static folder
 * Also does additional processing to "fix" WordPress content
 * - unwraps <p> that contain <img>
 * @param  {string} content               original sourced content
 * @param  {string} uploadsUrl            WordPress uploads url
 * @param  {string} wordPressUrl          WordPress site url
 * @param  {string} pathPrefix            Gatsby pathPrefix
 * @param  {bool}   generateWebp          is WebP required?
 * @param  {object} httpHeaders           custom httpHeaders
 * @param  {bool}   debugOutput           enables extra logging
 * @param  {object} params                Gatsby API object
 *
 * @return {string}                       processed HTML
 *
 * sourceParser(source, pluginOptions, params)
 */

module.exports = async function sourceParser(
  { content },
  {
    uploadsUrl,
    wordPressUrl,
    pathPrefix = '',
    generateWebp = true,
    httpHeaders = {},
    debugOutput = false,
  },
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

  const { imageOptions, supportedExtensions } = getPluginValues(pathPrefix);

  if (!content) {
    return '';
  }

  const $ = cheerio.load(content, { xmlMode: true, decodeEntities: false });

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

    if (imageRefs.some(({ url: storedUrl }) => storedUrl === url)) {
      // console.log('found image (again):' , url);
      return;
    }

    // console.log('found image:' , url);

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

  await Promise.all(
    imageRefs.map(async item => {
      const fileNode = await downloadMediaFile({
        url: item.url,
        cache,
        store,
        createNode,
        createNodeId,
        httpHeaders,
      });

      // non-image files are copied to the `/static` folder
      if (!supportedExtensions[fileNode.extension]) {
        let staticFile = copyToStatic({
          file: fileNode,
          getNodeAndSavePathDependency,
          context,
          pathPrefix,
        });

        swapSrc.set(item.urlKey, {
          src: staticFile,
          id: fileNode.id,
        });

        console.log(`Downloaded file: ${item.url}`);
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

      console.log(`Downloaded file:`, item.url);
    })
  );

  $('img').each((i, item) => {
    let url = item.attribs.src;
    let swapVal = swapSrc.get(url);
    if (!swapVal) {
      return;
    }

    // console.log('swapping src',$(item).attr('src'), '=>', swapVal.src)
    $(item).attr('src', swapVal.src);
    if (swapVal.encoded) {
      $(item).attr(
        'data-gts-encfluid',
        swapVal.encoded.replace(/"/g, '&quot;')
      );
    }
    $(item).removeAttr('srcset');
    $(item).removeAttr('sizes');
  });

  $('a').each((i, item) => {
    let url = item.attribs.href;
    let swapVal = swapSrc.get(url);
    if (!swapVal) {
      return;
    }

    // console.log('swapping href',$(item).attr('src'), '=>', swapVal.src)
    $(item).attr('href', swapVal.src);
    // prevents converting to <Link> in contentParser
    $(item).attr('data-gts-swapped-href', 'gts-swapped-href');
  });

  return $.html();
};
