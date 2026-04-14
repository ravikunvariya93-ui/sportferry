import dbConnect from './mongodb';
import User from '@/models/User';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first login, seed the token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Always refresh role from DB so changes take effect immediately
      if (token?.id) {
        try {
          await dbConnect();
          const freshUser = await User.findById(token.id).select('role').lean();
          if (freshUser) {
            token.role = freshUser.role;
          }
        } catch {
          // silently keep existing token role if DB fails
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  providers: [],
};
