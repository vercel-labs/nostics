import { createParse } from '@comark/nuxt/parse'
import emoji from '@comark/nuxt/plugins/emoji'
import headings from '@comark/nuxt/plugins/headings'
import highlight from '@comark/nuxt/plugins/highlight'
import mermaid from '@comark/nuxt/plugins/mermaid'
import toc from '@comark/nuxt/plugins/toc'
import { defineTransformer } from '@nuxt/content'

import latexLanguage from '@shikijs/langs/latex'

let parse
export default defineTransformer({
  name: 'markdown',
  extensions: ['.md'],
  parse: async (file) => {
    if (!parse) {
      parse = createParse({
        plugins: [
          highlight({
            languages: [latexLanguage],
          }),
          mermaid(),
          emoji(),
          toc(),
          headings(),
        ],
      })
    }
    const parsed = await parse(file.body)

    const result = {
      id: file.id,
      title: parsed.frontmatter.title,
      description: parsed.frontmatter.description,
      body: {
        type: 'minimark',
        value: parsed.nodes,
        toc: parsed.meta.toc,
      },
      data: parsed.frontmatter,
      meta: parsed.meta,
      ...parsed.frontmatter,
    } as any

    return result
  },
})
