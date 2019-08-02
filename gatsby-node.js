const { GraphQLString } = require(`gatsby/graphql`);
const sourceParser = require(`./src/sourceParser`);
const downloadImage = require(`./src/utils`).downloadImage;

// parses content sourced from WordPress/WPGraphQL
exports.createResolvers = async (params, pluginOptions) => {
  const contentNodeType = 'ParsedWordPressContent';
  const {
    createResolvers,
    createNodeId,
    createContentDigest,
    getNodesByType,
  } = params;
  const {
    actions: { createNode },
  } = params;
  const {
    processPostTypes = [],
    pathPrefix = '',
    generateWebp = true,
  } = pluginOptions;

  // `content` field Resolver
  // - passes content to sourceParser
  // - saves (caches) the result to a `ParsedWordPressContent` node
  // - repeat request for the same content (determined by uri) returns cached result
  const contentResolver = async (source, args, context, info) => {
    const { uri } = source;
    let parsedContent = '';

    if (!uri) {
      return source.content;
    }

    // if a node with a given URI exists
    const cached = findExistingNode(uri, getNodesByType(contentNodeType));
    // returns content from that node
    if (cached) {
      return cached.parsedContent;
    }

    try {
      parsedContent = await sourceParser(
        source,
        pluginOptions,
        params,
        context
      );
    } catch (e) {
      console.log(`Failed sourceParser at ${uri}`, e);
      return source.content;
    }

    let payload = {
      parsedContent,
      sourceId: source.id,
      sourceUri: source.uri,
      sourcePageId: source.pageId,
    };

    let node = {
      ...payload,
      id: createNodeId(source.uri, contentNodeType),
      children: [],
      parent: null,
      internal: {
        type: contentNodeType,
        contentDigest: createContentDigest(payload),
      },
    };

    await createNode(node);

    return parsedContent;
  };

  // caching all featured images local src and srcSet
  const featuredCache = new Map();

  // featuredImage: { sourceUrl, srcSet }
  const featuredImageResolver = async (source, args, context, info) => {
    if (!source.featuredImage || !source.featuredImage.sourceUrl) {
      return source.featuredImage;
    }

    const origUrl = source.featuredImage.sourceUrl;
    const cached = featuredCache.get(origUrl);
    const featuredImage = source.featuredImage;

    if (cached) {
      featuredImage.sourceUrl = cached.src;
      featuredImage.content = cached.fluidEncoded;
      featuredImage.srcSet && (featuredImage.srcSet = cached.srcSet);
      featuredImage.sizes && (featuredImage.sizes = cached.sizes);

      return featuredImage;
    }

    let imageData;

    try {
      imageData = await downloadImage(
        origUrl,
        params,
        pathPrefix,
        generateWebp
      );
    } catch (e) {
      console.log('Exception featured image', e);
      return featuredImage;
    }

    // hacky way of passing `fluid` object forward
    imageData.fluidEncoded = JSON.stringify(imageData);
    featuredCache.set(origUrl, imageData);
    featuredImage.sourceUrl = imageData.src;
    // content is not used (null) for featuredImage
    featuredImage.content = imageData.fluidEncoded;
    featuredImage.srcSet && (featuredImage.srcSet = imageData.srcSet);
    featuredImage.sizes && (featuredImage.sizes = imageData.sizes);
    console.log(`downloaded featured image ${origUrl}`);

    return featuredImage;
  };

  processPostTypes.forEach(element => {
    let params = {};
    params[`${pluginOptions.graphqlTypeName}_${element}`] = {
      content: {
        resolve: contentResolver,
      },
      featuredImage: {
        resolve: featuredImageResolver,
      },
    };
    createResolvers(params);
  });
};

// adds `originalSourceUrl` field that contains original URL
// for future extensions, not used at the moment
exports.setFieldsOnGraphQLNodeType = ({ type }, pluginOptions) => {
  if (type.name !== `File`) {
    return {};
  }

  return {
    originalSourceUrl: {
      type: GraphQLString,
      resolve: source => source.url,
    },
  };
};

const findExistingNode = (uri, allNodes) =>
  allNodes.find(node => node.sourceUri === uri);
