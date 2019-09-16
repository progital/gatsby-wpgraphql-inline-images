const { GraphQLString } = require('gatsby/graphql');
const sourceParser = require('./src/sourceParser');

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
  const { processPostTypes = [] } = pluginOptions;

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

  processPostTypes.forEach(element => {
    let params = {};
    params[`${pluginOptions.graphqlTypeName}_${element}`] = {
      content: {
        resolve: contentResolver,
      },
    };
    createResolvers(params);
  });
};

// adds `originalSourceUrl` field that contains original URL
// for future extensions, not used at the moment
exports.setFieldsOnGraphQLNodeType = ({ type }, pluginOptions) => {
  if (type.name !== 'File') {
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
