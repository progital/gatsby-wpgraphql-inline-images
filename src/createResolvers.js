const sourceParser = require('./sourceParser');
const debugLog = require('./utils').debugLog;

const findExistingNode = (uri, allNodes) =>
  allNodes.find(node => node.sourceUri === uri);

const postsBeingParsed = new Map();

module.exports = async function createResolvers(params, pluginOptions) {
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
    customTypeRegistrations = [],
    debugOutput = false,
    keyExtractor = (source, context, info) => source.uri,
  } = pluginOptions;

  const logger = (...args) => {
    args.unshift('>>>');
    debugLog(debugOutput, ...args);
  };

  // `content` field Resolver
  // - passes content to sourceParser
  // - saves (caches) the result to a `ParsedWordPressContent` node
  // - repeat request for the same content (determined by uri) returns cached result
  const contentResolver = async (source, args, context, info) => {
    // const { uri, path } = source;
    let uri = keyExtractor(source, context, info);
    let parsedContent = '';
    logger('Entered contentResolver @', uri || 'URI not defined, skipping');
    let content = source[info.fieldName];

    // uri works as a key for caching/processing functions
    // bails if no uri
    if (!uri) {
      return content;
    }

    // if a node with a given URI exists
    const cached = findExistingNode(uri, getNodesByType(contentNodeType));
    // returns content from that node
    if (cached) {
      logger('node already created:', uri);
      return cached.parsedContent;
    }

    // returns promise
    if (postsBeingParsed.has(uri)) {
      logger('node is already being parsed:', uri);
      return postsBeingParsed.get(uri);
    }

    const parsing = (async () => {
      try {
        logger('will start parsing:', uri);
        parsedContent = await sourceParser(
          { content },
          pluginOptions,
          params,
          context
        );
        return parsedContent;
      } catch (e) {
        console.log(`Failed sourceParser at ${uri}`, e);
        return content;
      }

      logger(`[ORIGINAL CONTENT @ ${uri}]`, content);
      logger(`[PARSED CONTENT @ ${uri}]`, parsedContent);

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

      logger('done parsing, creating node:', uri);
      await createNode(node);

      return parsedContent;
    })();

    postsBeingParsed.set(uri, parsing);

    return parsing;
  };

  processPostTypes.forEach(element => {
    let params = {};
    params[`${pluginOptions.graphqlTypeName}_${element}`] = {
      content: {
        resolve: contentResolver,
      },
    };
    logger('Registering ', `${pluginOptions.graphqlTypeName}_${element}`);

    createResolvers(params);
  });
  customTypeRegistrations.forEach(registration => {
    let params = {};
    params[registration.graphqlTypeName] = {
      [registration.fieldName]: {
        resolve: contentResolver,
      },
    };
    logger('Registering custom resolver ', registration.graphqlTypeName);

    createResolvers(params);
  });
};
