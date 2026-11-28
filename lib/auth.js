import NextAuth from 'next-auth';
import { cookies } from 'next/headers';
import CredentialsProvider from 'next-auth/providers/credentials';
import { CredentialsSignin } from 'next-auth';
import Google from 'next-auth/providers/google';
import dbConnect from './mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { escapeRegex } from './validation';
import { sharedRateLimit, clientIp } from './rateLimit';

/** Thrown when the sign-in throttle trips, so the login page can say "slow down". */
class RateLimitedSignin extends CredentialsSignin {
  constructor() {
    super();
    this.code = 'rate_limited';
  }
}

// A localhost AUTH_URL/NEXTAUTH_URL (common when .env.local is copied into a
// hosted environment) makes Auth.js build OAuth callback URLs against
// localhost — Google then rejects them with redirect_uri_mismatch. In
// production, ignore such a value so the origin is taken from the request host
// instead (trustHost: true).
if (process.env.NODE_ENV === 'production') {
  const publicUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || '';
  if (/localhost|127\.0\.0\.1/i.test(publicUrl)) {
    console.warn('[auth] Ignoring localhost AUTH_URL/NEXTAUTH_URL in production — using the request host instead.');
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  }
}

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
      async authorize(credentials, request) {
        // Accept only strings — guards against NoSQL-operator injection through
        // the credentials payload (e.g. { username: { $ne: null } }).
        const identifier = typeof credentials?.username === 'string' ? credentials.username.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!identifier || !password) {
          return null;
        }

        // Throttle by identifier AND by client IP. Without this, a wrong
        // password can be retried indefinitely — every other sensitive route
        // (register, upload, forgot-password, checkout) is already limited.
        const ip = clientIp(request);
        const [byIdentifier, byIp] = await Promise.all([
          sharedRateLimit(`login:id:${identifier.toLowerCase()}`, { limit: 8, windowMs: 15 * 60 * 1000 }),
          sharedRateLimit(`login:ip:${ip}`, { limit: 25, windowMs: 15 * 60 * 1000 }),
        ]);
        if (!byIdentifier.ok || !byIp.ok) {
          throw new RateLimitedSignin();
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

        // A blocked account cannot sign in.
        if (user.blocked) {
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
      // For Google sign-in, auto-create the user if they don't exist yet
      if (account?.provider === 'google') {
        await dbConnect();
        if (!user.email) {
          // Google did not give us an email — we cannot identify the account.
          return '/login?error=google_no_email';
        }
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
        } else {
          // The email already has an account — sign in as that account instead
          // of creating a second one for the same email. Google has verified
          // that the person controls the address, so this is the same human.
          //
          // Known trade-off: registration does not verify emails, so someone
          // could register another person's address and claim their later
          // Google sign-in. Closing that needs email verification (see
          // .project-memory/SECURITY.md) — refuse-by-default was worse: it
          // locked out every player who registered with a password.
          // A blocked account cannot sign in, even via Google.
          if (existingUser.blocked) {
            return '/login?error=blocked';
          }
          user.id = existingUser._id.toString();
          user.name = existingUser.name;
          user.role = existingUser.role;
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

/**
 * The authoritative role of the signed-in user.
 *
 * The role is baked into the JWT, so a promotion or demotion would not take
 * effect until the next sign-in. Route handlers re-read it from the database
 * so a demoted admin loses access immediately.
 */
export async function roleOf(session) {
  const id = session?.user?.id;
  if (!id) return null;
  try {
    await dbConnect();
    const user = await User.findById(id).select('role blocked').lean();
    // A blocked account loses its role — this revokes API access even while an
    // existing JWT is still valid.
    if (!user || user.blocked) return null;
    return user.role || null;
  } catch {
    return session?.user?.role || null;
  }
}

/** True when the signed-in user currently holds one of the given roles. */
export async function hasRole(session, ...roles) {
  const role = await roleOf(session);
  return Boolean(role) && roles.includes(role);
}
