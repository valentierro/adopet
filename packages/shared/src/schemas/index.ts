import { z } from 'zod';

export const speciesSchema = z.enum(['dog', 'cat']);
export const sexSchema = z.enum(['male', 'female']);
export const petSizeSchema = z.enum(['small', 'medium', 'large', 'xlarge']);
export const swipeDirectionSchema = z.enum(['like', 'pass']);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  phone: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const petSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  species: speciesSchema,
  age: z.number().int().min(0),
  sex: sexSchema,
  size: petSizeSchema,
  vaccinated: z.boolean(),
  neutered: z.boolean(),
  description: z.string(),
  distanceKm: z.number().min(0).optional(),
  photos: z.array(z.string().url()),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const swipeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  petId: z.string().uuid(),
  direction: swipeDirectionSchema,
  createdAt: z.string().datetime(),
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  participantIds: z.array(z.string().uuid()),
  petId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().optional(),
});

export type UserInput = z.infer<typeof userSchema>;
export type PetInput = z.infer<typeof petSchema>;
export type SwipeInput = z.infer<typeof swipeSchema>;
export type ConversationInput = z.infer<typeof conversationSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
