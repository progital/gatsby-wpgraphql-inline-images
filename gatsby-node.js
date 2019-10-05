const { GraphQLString } = require('gatsby/graphql');

// parses content sourced from WordPress/WPGraphQL
exports.createResolvers = require('./src/createResolvers');

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

