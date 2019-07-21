# gatsby-wpgraphql-inline-images

## Description

Source plugins don't process links and images in blocks of text which makes sourcing from CMS such as WordPress problematic. This plugin solves that for content sourced from WordPress using GraphQL by doing the following:

- Downloads images and other files to Gatsby `static` folder
- Replaces `<a>` linking to other pages with `<Link>` component
- Replaces `<img>` with Gatsby `<Img>` component providing all of the [gatsby-image](https://www.gatsbyjs.org/docs/using-gatsby-image/) rich functionality

### Dependencies

This plugin processes WordPress content sourced with GraphQL. Therefore you must use `gatsby-source-graphql` and your source WordPress site must use [WPGraphQL](https://github.com/wp-graphql/wp-graphql).

_Attention:_ doesn't work with `gatsby-source-wordpress`.

## How to install

```bash
yarn add gatsby-wpgraphql-inline-images
```

```javascript
{
  resolve: 'gatsby-wpgraphql-inline-images',
  options: {
    wordPressUrl: 'https://mydomain.com/',
    uploadsUrl: 'https://mydomain.com/wp-content/uploads/',
    processPostTypes: ['Page', 'Post', 'CustomPost'],
    graphqlTypeName: 'WPGraphQL',
  },
},
```

## Available options

`wordPressUrl` and `uploadsUrl` contain URLs of source WordPress site and it's uploads folder respectively.

`processPostTypes` determines which post types to process. You can include [custom post types](https://docs.wpgraphql.com/getting-started/custom-post-types) as defined in WPGraphQL.

`graphqlTypeName` should contain the same `typeName` used in `gatsby-source-graphql` parameters.

## How do I use this plugin?

Downloading and optimizing images is done automatically via resolvers. However there is an additional step of processing content that must be added manually to a page template.

```javascript
import contentParser from 'gatsby-wpgraphql-inline-images';
```

replace `<div dangerouslySetInnerHTML={{ __html: content }} />` with this

```javascript
<div>{contentParser({ content }, { wordPressUrl, uploadsUrl })}</div>
```

Where `content` is the original HTML content. `contenParser` returns React object.

## Gatsby themes support

Inserted <Img> components have `variant: 'styles.SourcedImage'` applied to them.

## Examples of usage

We're going to use [gatsby-wpgraphql-blog-example](https://github.com/wp-graphql/gatsby-wpgraphql-blog-example) as starter. I've set up a demo site at [noh.progital.dev](https://noh.progital.dev/). It has `Event` custom post type set up as an example.

Add this plugin to your `gatsby-config.js`

```javascript
{
  resolve: 'gatsby-wpgraphql-inline-images',
  options: {
    wordPressUrl: `https://noh.progital.dev/`,
    uploadsUrl: `https://noh.progital.dev/wp-content/uploads/`,
    processPostTypes: ["Page", "Post", "Event"],
    graphqlTypeName: 'WPGraphQL',
  },
},
```

Use the same settings for `gatsby-source-graphql`.

## How to contribute

This is a WIP and any contribution, feedback or PRs are very welcome. Issues is a preferred way of submitting feedback, you can also email to [andrey@progital.io](mailto:andrey@progital.io).

While this plugin was designed for sourcing from WordPress it could be adapted for other use cases.
