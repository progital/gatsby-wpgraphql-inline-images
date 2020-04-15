# gatsby-wpgraphql-inline-images

## Description

Source plugins don't process links and images in blocks of text (i.e. post contents) which makes sourcing from CMS such as WordPress problematic. This plugin solves that for content sourced from WordPress using GraphQL by doing the following:

- Downloads images and other files to Gatsby `static` folder
- Replaces `<a>` linking to site's pages with `<Link>` component
- Replaces `<img>` with Gatsby `<Img>` component leveraging all of the [gatsby-image](https://www.gatsbyjs.org/docs/using-gatsby-image/) rich functionality

A [major update](https://github.com/gatsbyjs/gatsby/issues/19292) is in the works for the WordPress source plugin and WPGraphQL. This plugin will be radically changed or even become redundant after V4 is completed.

### Dependencies

This plugin processes WordPress content sourced with GraphQL. Therefore you must use `gatsby-source-graphql` and your source WordPress site must use [WPGraphQL](https://github.com/wp-graphql/wp-graphql).

_Attention:_ does not work with `gatsby-source-wordpress`.

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
    httpHeaders: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }
  },
},
```

## Available options

`wordPressUrl` and `uploadsUrl` contain URLs of the source WordPress site and it's `uploads` folder respectively.

`processPostTypes` determines which post types to process. You can include [custom post types](https://docs.wpgraphql.com/getting-started/custom-post-types) as defined in WPGraphQL.

`customTypeRegistrations` allows additional registration of parsed html content for arbitrary graphql types. For more information, see examples below.

`keyExtractor` a function that extracts the cache key for a specific node, typically this is the `uri` of a post.

`graphqlTypeName` should contain the same `typeName` used in `gatsby-source-graphql` parameters.

`generateWebp` _(boolean)_ adds [WebP images](https://www.gatsbyjs.org/docs/gatsby-image/#about-withwebp).

`httpHeaders` Adds extra http headers to download request if passed in.

`debugOutput` _(boolean)_ Outputs extra debug messages.

## How do I use this plugin?

Downloading and optimizing images is done automatically via resolvers. You need to include `uri` in all queries that will be processed by the plugin otherwise they will be ignored.

```
query GET_PAGES {
  wpgraphql {
    pages {
      nodes {
        uri
        content
      }
    }
  }
}
```

There is an additional step of processing content that must be added manually to a page template. This additional processing replaces remote urls with links to downloaded files in Gatsby's static folder.

```javascript
import contentParser from 'gatsby-wpgraphql-inline-images';
```

replace `<div dangerouslySetInnerHTML={{ __html: content }} />` with this

```javascript
<div>{contentParser({ content }, { wordPressUrl, uploadsUrl })}</div>
```

Where `content` is the original HTML content and URLs should use the same values as in the options above. `contenParser` returns React object.

### Featured image

The recommended handling of `featuredImage` and WordPress media in general is described by [henrikwirth](https://github.com/henrikwirth) in [this article](https://dev.to/nevernull/gatsby-with-wpgraphql-acf-and-gatbsy-image-72m) and [this gist](https://gist.github.com/henrikwirth/4ba900b7f89b9e28ec81497466b12710).

### WordPress galleries

WordPress galleries may need some additional styling applied and this was intentionally left out of the scope of this plugin. Emotion [Global Styles](https://emotion.sh/docs/globals) may be used or just import sass/css file.

```css
.gallery {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.gallery-item {
  margin-right: 10px;
}
```

## Gatsby themes support

Inserted `<Img>` components have `variant: 'styles.SourcedImage'` applied to them.

## Examples of usage

I'm going to use [gatsby-wpgraphql-blog-example](https://github.com/wp-graphql/gatsby-wpgraphql-blog-example) as a starter and it will source data from a demo site at [yourdomain.dev](https://yourdomain.dev/).

Add this plugin to the `gatsby-config.js`

```javascript
{
  resolve: 'gatsby-wpgraphql-inline-images',
  options: {
    wordPressUrl: `https://yourdomain.dev/`,
    uploadsUrl: `https://yourdomain.dev/wp-content/uploads/`,
    processPostTypes: ["Page", "Post"],
    graphqlTypeName: 'WPGraphQL',
  },
},
```

Change `url` in `gatsby-source-graphql` options to `https://yourdomain.dev/graphql`

Page templates are stored in `src/templates`. Let's modify `post.js` as an example.

Importing `contentParser`

```javascript
import contentParser from 'gatsby-wpgraphql-inline-images';
```

For simplicty's sake I'm just going to add URLs directly in the template.

```javascript
const pluginOptions = {
  wordPressUrl: `https://yourdomain.dev/`,
  uploadsUrl: `https://yourdomain.dev/wp-content/uploads/`,
};
```

and replace `dangerouslySetInnerHTML` with this

```javascript
<div>{contentParser({ content }, pluginOptions)}</div>
```

The modified example starter is available at [github.com/progital/gatsby-wpgraphql-blog-example](https://github.com/progital/gatsby-wpgraphql-blog-example).

## Examples of advanced usage

Add this plugin to the `gatsby-config.js`

```javascript
{
  resolve: 'gatsby-wpgraphql-inline-images',
  options: {
    wordPressUrl: `https://yourdomain.dev/`,
    uploadsUrl: `https://yourdomain.dev/wp-content/uploads/`,
    graphqlTypeName: 'WPGraphQL',
    customTypeRegistrations: [
      {
        graphqlTypeName: "WPGraphQL_Page_Acfdemofields",
        fieldName: "fieldInAcf",
      },
    ],
    keyExtractor: (source, context, info) => source.uri || source.key,
  },
},
```

This example assumes that there is a GraphQL type `WPGraphQL_Page_Acfdemofields` that has a field `fieldInAcf`, e.g.

```
query MyQuery {
  wpgraphql {
    pages {
      nodes {
        acfDemoFields {
          fieldInAcf
        }
      }
    }
  }
}
```

## How to contribute

This is a WIP and any contribution, feedback and PRs are very welcome. Issues is a preferred way of submitting feedback, but you can also email to [andrey@progital.io](mailto:andrey@progital.io).
