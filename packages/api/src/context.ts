import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as trpc from '@trpc/server';
import * as trpcNext from '@trpc/server/adapters/next';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createContext = async ({
  req,
  res,
}: trpcNext.CreateNextContextOptions): Promise<Context> => {
  const token = req.headers.authorization;
  const jwt = token?.split(' ')[1]; // Extract JWT from Authorization header

  // If JWT exists, attempt to get the user from Supabase
  if (jwt) {
    try {
      const { user, error } = await supabase.auth.api.getUser(jwt);
      
      if (error) {
        console.error('Supabase Auth Error:', error.message);
        return { req, res, prisma, user: null, supabase };
      }

      // Return context with user info
      return { req, res, prisma, user, supabase };
    } catch (err) {
      console.error('Error fetching user from Supabase:', err);
      return { req, res, prisma, user: null, supabase };
    }
  }

  // If no JWT, return context with null user
  return { req, res, prisma, user: null, supabase };
};

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
