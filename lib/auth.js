import NextAuth from 'next-auth';
import { cookies } from 'next/headers';
import CredentialsProvider from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import dbConnect from './mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { escapeRegex } from './validation';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Accept only strings — guards against NoSQL-operator injection through
        // the credentials payload (e.g. { username: { $ne: null } }).
        const identifier = typeof credentials?.username === 'string' ? credentials.username.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!identifier || !password) {
          return null;
        }

        await dbConnect();

        // Sign in with either the username or the email address. Email is matched
        // case-insensitively and the input is regex-escaped so a crafted value
        // can't inject operators or patterns.
        const user = await User.findOne({
          $or: [
            { username: identifier },
            { email: { $regex: `^${escapeRegex(identifier)}$`, $options: 'i' } },
          ],
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // For Google sign-in, auto-create user if they don't exist
      if (account?.provider === 'google') {
        await dbConnect();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          // Honour the Player (PLAYER) / Ground Owner (VENDOR) choice made on the
          // sign-up screen. Never ADMIN — that is provisioned separately.
          let role = 'PLAYER';
          try {
            const requested = cookies().get('sportferry_oauth_role')?.value;
            if (requested === 'VENDOR') role = 'VENDOR';
          } catch { /* no request scope — default to PLAYER */ }

          await User.create({
            name: user.name,
            email: user.email,
            username: user.email, // Use email as username for Google users
            password: '',         // No password for OAuth users
            role,
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // On first login, seed the token with user fields
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      // For Google users, fetch role and id from DB
      if (account?.provider === 'google') {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
});
