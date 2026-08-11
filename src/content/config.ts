import { defineCollection, z } from 'astro:content';

const recipes = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    servings: z.number().int().positive(),
    prepTimeMinutes: z.number().int().positive(),
    tags: z.array(z.string()).nonempty(),
    ingredients: z
      .array(
        z.object({
          ingredientId: z.string(),
          quantity: z.string(),
        })
      )
      .nonempty(),
  }),
});

export const collections = { recipes };
